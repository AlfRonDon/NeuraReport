from __future__ import annotations

import asyncio
import concurrent.futures
import contextlib
import json
import logging
import os
import re
import time
import uuid
from pathlib import Path
from typing import Any, Iterable, Mapping, Optional

from fastapi import HTTPException, Request

from backend.app.core.event_bus import Event, EventBus, logging_middleware, metrics_middleware
from backend.app.domain.reports.strategies import build_notification_strategy_registry, build_render_strategy_registry
from backend.app.features.generate.schemas.reports import RunPayload
from backend.app.services.utils import (
    TemplateLockError,
    acquire_template_lock,
    validate_contract_schema,
    write_artifact_manifest,
)
from backend.app.services.utils.artifacts import load_manifest
from backend.app.services.state import state_store
from src.core.config import EXCEL_UPLOAD_ROOT, UPLOAD_ROOT
from src.utils.connection_utils import db_path_from_payload_or_default
from src.utils.email_utils import normalize_email_targets
from src.utils.schedule_utils import clean_key_values

logger = logging.getLogger(__name__)
EVENT_BUS = EventBus(middlewares=[logging_middleware(logger), metrics_middleware(logger)])
RENDER_STRATEGIES = build_render_strategy_registry()
NOTIFICATION_STRATEGIES = build_notification_strategy_registry()

_UPLOAD_KIND_PREFIXES: dict[str, str] = {"pdf": "uploads", "excel": "excel-uploads"}
UPLOAD_ROOT_BASE = UPLOAD_ROOT.resolve()
EXCEL_UPLOAD_ROOT_BASE = EXCEL_UPLOAD_ROOT.resolve()

_JOB_MAX_WORKERS = max(int(os.getenv("NEURA_JOB_MAX_WORKERS", "4") or "4"), 1)
REPORT_JOB_EXECUTOR = concurrent.futures.ThreadPoolExecutor(
    max_workers=_JOB_MAX_WORKERS,
    thread_name_prefix="nr-job",
)
_JOB_TASKS: set[asyncio.Task] = set()


def _http_error(status_code: int, code: str, message: str, details: str | None = None) -> HTTPException:
    payload: dict[str, Any] = {"status": "error", "code": code, "message": message}
    if details:
        payload["detail"] = details
    return HTTPException(status_code=status_code, detail=payload)


def _track_background_task(task: asyncio.Task) -> None:
    _JOB_TASKS.add(task)

    def _cleanup(t: asyncio.Task) -> None:
        _JOB_TASKS.discard(t)

    task.add_done_callback(_cleanup)


def _publish_event_safe(event: Event) -> None:
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.run_coroutine_threadsafe(EVENT_BUS.publish(event), loop)
        else:
            loop.run_until_complete(EVENT_BUS.publish(event))
    except RuntimeError:
        try:
            asyncio.run(EVENT_BUS.publish(event))
        except Exception:
            logger.exception(
                "event_bus_publish_failed",
                extra={"event": event.name, "correlation_id": event.correlation_id},
            )
    except Exception:
        logger.exception(
            "event_bus_publish_failed",
            extra={"event": event.name, "correlation_id": event.correlation_id},
        )


DEFAULT_JOB_STEP_PROGRESS = {
    "dataLoad": 5.0,
    "contractCheck": 15.0,
    "renderPdf": 60.0,
    "renderDocx": 75.0,
    "renderXlsx": 85.0,
    "finalize": 95.0,
    "email": 100.0,
}


def _job_error_message(detail: Any) -> str:
    if isinstance(detail, Mapping):
        message = detail.get("message") or detail.get("detail")
        if message:
            return str(message)
        return json.dumps(detail, ensure_ascii=False)
    return str(detail)


def _build_job_steps(payload: RunPayload, *, kind: str) -> list[dict[str, str]]:
    steps: list[dict[str, str]] = [
        {"name": "dataLoad", "label": "Load database"},
        {"name": "contractCheck", "label": "Prepare contract"},
        {"name": "renderPdf", "label": "Render PDF"},
    ]
    steps.append({"name": "renderDocx", "label": "Render DOCX"})
    if kind == "excel" or bool(payload.xlsx):
        steps.append({"name": "renderXlsx", "label": "Render XLSX"})
    steps.append({"name": "finalize", "label": "Finalize artifacts"})
    if normalize_email_targets(payload.email_recipients):
        steps.append({"name": "email", "label": "Send email"})
    return steps


def _step_progress_from_steps(steps: Iterable[Mapping[str, Any]]) -> dict[str, float]:
    progress: dict[str, float] = {}
    for step in steps:
        name = str(step.get("name") or "").strip()
        if not name:
            continue
        progress[name] = DEFAULT_JOB_STEP_PROGRESS.get(name, 0.0)
    return progress


class JobRunTracker:
    def __init__(
        self,
        job_id: str | None,
        *,
        correlation_id: str | None = None,
        step_progress: Optional[Mapping[str, float]] = None,
    ) -> None:
        self.job_id = job_id
        self.correlation_id = correlation_id
        self.step_progress = {k: float(v) for k, v in (step_progress or {}).items()}
        self._step_names = set(self.step_progress.keys()) if self.step_progress else None

    def _should_track(self, name: str) -> bool:
        if not name:
            return False
        if self._step_names is None:
            return True
        return name in self._step_names

    def has_step(self, name: str) -> bool:
        return self._should_track(name)

    def start(self) -> None:
        if not self.job_id:
            return
        try:
            state_store.record_job_start(self.job_id)
        except Exception:
            logger.exception(
                "job_start_record_failed",
                extra={
                    "event": "job_start_record_failed",
                    "job_id": self.job_id,
                    "correlation_id": self.correlation_id,
                },
            )

    def progress(self, value: float) -> None:
        if not self.job_id:
            return
        try:
            state_store.record_job_progress(self.job_id, value)
        except Exception:
            logger.exception(
                "job_progress_record_failed",
                extra={
                    "event": "job_progress_record_failed",
                    "job_id": self.job_id,
                    "correlation_id": self.correlation_id,
                },
            )

    def _record_step(
        self,
        name: str,
        status: str,
        *,
        error: Optional[str] = None,
        progress: Optional[float] = None,
        label: Optional[str] = None,
    ) -> None:
        if not self.job_id or not self._should_track(name):
            return
        try:
            state_store.record_job_step(
                self.job_id,
                name,
                status=status,
                error=error,
                progress=progress,
                label=label,
            )
        except Exception:
            logger.exception(
                "job_step_record_failed",
                extra={
                    "event": "job_step_record_failed",
                    "job_id": self.job_id,
                    "step": name,
                    "correlation_id": self.correlation_id,
                },
            )

    def step_running(self, name: str, *, label: Optional[str] = None) -> None:
        self._record_step(name, "running", label=label)

    def step_succeeded(self, name: str, *, progress: Optional[float] = None) -> None:
        progress_value = progress if progress is not None else self.step_progress.get(name)
        self._record_step(name, "succeeded")
        if progress_value is not None:
            self.progress(progress_value)

    def step_failed(self, name: str, error: str) -> None:
        self._record_step(name, "failed", error=str(error))

    def succeed(self, result: Optional[Mapping[str, Any]]) -> None:
        if not self.job_id:
            return
        self.progress(100.0)
        try:
            state_store.record_job_completion(self.job_id, status="succeeded", error=None, result=result)
        except Exception:
            logger.exception(
                "job_completion_record_failed",
                extra={
                    "event": "job_completion_record_failed",
                    "job_id": self.job_id,
                    "correlation_id": self.correlation_id,
                },
            )

    def fail(self, error: str, *, status: str = "failed") -> None:
        if not self.job_id:
            return
        try:
            state_store.record_job_completion(self.job_id, status=status, error=str(error), result=None)
        except Exception:
            logger.exception(
                "job_completion_record_failed",
                extra={
                    "event": "job_completion_record_failed",
                    "job_id": self.job_id,
                    "correlation_id": self.correlation_id,
                },
            )


_TEMPLATE_ID_SAFE_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{2,180}$")


def _normalize_template_id(template_id: str) -> str:
    raw = str(template_id or "").strip()
    candidate = raw.replace("\\", "/").split("/")[-1].strip()
    if not candidate or candidate in {".", ".."}:
        raise _http_error(400, "invalid_template_id", "Invalid template_id format")
    normalized = candidate.lower()
    if _TEMPLATE_ID_SAFE_RE.fullmatch(normalized):
        return normalized
    try:
        return str(uuid.UUID(candidate))
    except (ValueError, TypeError):
        raise _http_error(400, "invalid_template_id", "Invalid template_id format")


def _template_dir(
    template_id: str,
    *,
    must_exist: bool = True,
    create: bool = False,
    kind: str = "pdf",
) -> Path:
    normalized_kind = (kind or "pdf").lower()
    if normalized_kind not in _UPLOAD_KIND_PREFIXES:
        raise _http_error(400, "invalid_template_kind", f"Unsupported template kind: {kind}")

    base_dir = UPLOAD_ROOT_BASE if normalized_kind == "pdf" else EXCEL_UPLOAD_ROOT_BASE
    tid = _normalize_template_id(template_id)
    tdir = (base_dir / tid).resolve()
    if base_dir not in tdir.parents:
        raise _http_error(400, "invalid_template_path", "Invalid template_id path")
    if must_exist and not tdir.exists():
        raise _http_error(404, "template_not_found", "template_id not found")
    if create:
        tdir.mkdir(parents=True, exist_ok=True)
    return tdir


def _artifact_url(path: Path | None) -> Optional[str]:
    if path is None:
        return None
    path = Path(path)
    resolved = path.resolve()
    mapping: dict[Path, str] = {
        UPLOAD_ROOT_BASE: f"/{_UPLOAD_KIND_PREFIXES['pdf']}",
        EXCEL_UPLOAD_ROOT_BASE: f"/{_UPLOAD_KIND_PREFIXES['excel']}",
    }
    for base, prefix in mapping.items():
        try:
            relative = resolved.relative_to(base)
        except ValueError:
            continue
        safe = relative.as_posix()
        return f"{prefix}/{safe}"
    return None


def _manifest_endpoint(template_id: str, kind: str = "pdf") -> str:
    if (kind or "pdf").lower() == "excel":
        return f"/excel/{template_id}/artifacts/manifest"
    return f"/templates/{template_id}/artifacts/manifest"


_EXCEL_SCALE_RE = re.compile(r"--excel-print-scale:\s*([0-9]*\.?[0-9]+)")


def _extract_excel_print_scale_from_html(html_path: Path) -> Optional[float]:
    try:
        html_text = html_path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return None
    match = _EXCEL_SCALE_RE.search(html_text)
    if not match:
        return None
    try:
        value = float(match.group(1))
    except (TypeError, ValueError):
        return None
    if value <= 0 or value > 1.0:
        return None
    return value


def _ensure_contract_files(template_id: str, *, kind: str = "pdf") -> tuple[Path, Path]:
    tdir = _template_dir(template_id, kind=kind)

    template_html_path = tdir / "report_final.html"
    if not template_html_path.exists():
        template_html_path = tdir / "template_p1.html"
    if not template_html_path.exists():
        raise _http_error(
            status_code=404,
            code="template_html_missing",
            message="No template HTML found (report_final.html or template_p1.html).",
        )

    contract_path = tdir / "contract.json"
    if not contract_path.exists():
        raise _http_error(
            status_code=400,
            code="contract_missing",
            message="Missing contract.json. Finish template approval/mapping to create a contract for generation.",
        )
    return template_html_path, contract_path


def _artifact_map_from_paths(
    out_html: Path,
    out_pdf: Path,
    out_docx: Path | None,
    out_xlsx: Path | None,
) -> dict[str, Path]:
    artifacts = {out_html.name: out_html, out_pdf.name: out_pdf}
    if out_docx:
        artifacts[out_docx.name] = out_docx
    if out_xlsx:
        artifacts[out_xlsx.name] = out_xlsx
    return artifacts


def _run_report_internal(
    p: RunPayload,
    *,
    kind: str = "pdf",
    correlation_id: str | None = None,
    job_tracker: JobRunTracker | None = None,
):
    run_started = time.time()
    logger.info(
        "reports_run_start",
        extra={
            "event": "reports_run_start",
            "template_id": p.template_id,
            "connection_id": p.connection_id,
            "template_kind": kind,
            "correlation_id": correlation_id,
        },
    )
    if job_tracker:
        job_tracker.step_running("dataLoad", label="Load database connection")
    db_path = db_path_from_payload_or_default(p.connection_id)
    if not db_path.exists():
        if job_tracker:
            job_tracker.step_failed("dataLoad", f"DB not found: {db_path}")
        raise _http_error(400, "db_not_found", f"DB not found: {db_path}")
    if job_tracker:
        job_tracker.step_succeeded("dataLoad")

    if job_tracker:
        job_tracker.step_running("contractCheck", label="Prepare contract")
    try:
        template_html_path, contract_path = _ensure_contract_files(p.template_id, kind=kind)
    except HTTPException as exc:
        if job_tracker:
            job_tracker.step_failed("contractCheck", _job_error_message(exc.detail))
        raise
    tdir = template_html_path.parent

    try:
        contract_data = json.loads(contract_path.read_text(encoding="utf-8"))
    except Exception as exc:
        if job_tracker:
            job_tracker.step_failed("contractCheck", f"Invalid contract.json: {exc}")
        raise _http_error(500, "invalid_contract", f"Invalid contract.json: {exc}")
    else:
        try:
            validate_contract_schema(contract_data)
        except Exception as exc:
            if job_tracker:
                job_tracker.step_failed("contractCheck", str(exc))
            raise _http_error(500, "invalid_contract", str(exc))
    if job_tracker:
        job_tracker.step_succeeded("contractCheck")

    key_values_payload = clean_key_values(p.key_values)

    docx_requested = bool(p.docx)
    xlsx_requested = bool(p.xlsx)
    docx_landscape = kind == "excel"
    docx_enabled = docx_requested or docx_landscape or kind == "pdf"
    xlsx_enabled = xlsx_requested or kind == "excel"
    render_strategy = RENDER_STRATEGIES.resolve("excel" if docx_landscape or xlsx_enabled else "pdf")

    ts = str(int(time.time()))
    out_html = tdir / f"filled_{ts}.html"
    out_pdf = tdir / f"filled_{ts}.pdf"
    out_docx = tdir / f"filled_{ts}.docx" if docx_enabled else None
    out_xlsx = tdir / f"filled_{ts}.xlsx" if xlsx_enabled else None
    tmp_html = out_html.with_name(out_html.name + ".tmp")
    tmp_pdf = out_pdf.with_name(out_pdf.name + ".tmp")
    tmp_docx = out_docx.with_name(out_docx.name + ".tmp") if out_docx else None
    tmp_xlsx = out_xlsx.with_name(out_xlsx.name + ".tmp") if out_xlsx else None
    docx_path: Path | None = None
    docx_font_scale: float | None = None
    xlsx_path: Path | None = None

    try:
        lock_ctx = acquire_template_lock(tdir, "reports_run", correlation_id)
    except TemplateLockError:
        raise _http_error(409, "template_locked", "Template is currently processing another request.")

    with lock_ctx:
        try:
            if job_tracker:
                job_tracker.step_running("renderPdf", label="Render PDF artifacts")
            if kind == "excel":
                from backend.app.services.reports import ReportGenerateExcel as report_generate_module
            else:
                from backend.app.services.reports import ReportGenerate as report_generate_module

            fill_and_print = report_generate_module.fill_and_print

            fill_and_print(
                OBJ=contract_data,
                TEMPLATE_PATH=template_html_path,
                DB_PATH=db_path,
                OUT_HTML=tmp_html,
                OUT_PDF=tmp_pdf,
                START_DATE=p.start_date,
                END_DATE=p.end_date,
                batch_ids=p.batch_ids,
                KEY_VALUES=key_values_payload,
            )
            if tmp_html.exists():
                tmp_html.replace(out_html)
            if tmp_pdf.exists():
                tmp_pdf.replace(out_pdf)
            docx_step_tracked = bool(job_tracker and job_tracker.has_step("renderDocx"))
            if docx_enabled and out_docx and tmp_docx:
                if docx_step_tracked:
                    job_tracker.step_running("renderDocx", label="Render DOCX")
                docx_tmp_result: Path | None = None
                docx_error: str | None = None
                try:
                    if docx_landscape:
                        docx_font_scale = _extract_excel_print_scale_from_html(out_html) or docx_font_scale
                    docx_tmp_result = render_strategy.render_docx(
                        out_html,
                        out_pdf if out_pdf and Path(out_pdf).exists() else None,
                        tmp_docx,
                        landscape=docx_landscape,
                        font_scale=docx_font_scale or (0.82 if docx_landscape else None),
                    )
                except Exception as exc:
                    with contextlib.suppress(FileNotFoundError):
                        tmp_docx.unlink(missing_ok=True)
                    docx_error = f"DOCX export failed: {exc}"
                    logger.exception(
                        "docx_export_failed",
                        extra={
                            "event": "docx_export_failed",
                            "template_id": p.template_id,
                            "template_kind": kind,
                            "correlation_id": correlation_id,
                        },
                    )
                else:
                    if docx_tmp_result:
                        docx_tmp_path = Path(docx_tmp_result)
                        if docx_tmp_path != out_docx:
                            docx_tmp_path.replace(out_docx)
                        docx_path = out_docx
                    else:
                        with contextlib.suppress(FileNotFoundError):
                            tmp_docx.unlink(missing_ok=True)
                if docx_step_tracked:
                    if docx_error:
                        job_tracker.step_failed("renderDocx", docx_error)
                    else:
                        job_tracker.step_succeeded("renderDocx")
                if docx_path and not docx_error:
                    _publish_event_safe(
                        Event(
                            name="render.completed",
                            payload={"template_id": p.template_id, "kind": "docx"},
                            correlation_id=correlation_id,
                        )
                    )
            xlsx_step_tracked = bool(job_tracker and job_tracker.has_step("renderXlsx"))
            if xlsx_enabled and out_xlsx and tmp_xlsx:
                if xlsx_step_tracked:
                    job_tracker.step_running("renderXlsx", label="Render XLSX")
                xlsx_error: str | None = None
                try:
                    xlsx_tmp_result = render_strategy.render_xlsx(out_html, tmp_xlsx)
                except Exception as exc:
                    with contextlib.suppress(FileNotFoundError):
                        tmp_xlsx.unlink(missing_ok=True)
                    logger.exception(
                        "xlsx_export_failed",
                        extra={
                            "event": "xlsx_export_failed",
                            "template_id": p.template_id,
                            "template_kind": kind,
                            "correlation_id": correlation_id,
                        },
                    )
                    xlsx_error = f"XLSX export failed: {exc}"
                else:
                    if xlsx_tmp_result:
                        xlsx_tmp_path = Path(xlsx_tmp_result)
                        if xlsx_tmp_path != out_xlsx:
                            xlsx_tmp_path.replace(out_xlsx)
                        xlsx_path = out_xlsx
                    else:
                        with contextlib.suppress(FileNotFoundError):
                            tmp_xlsx.unlink(missing_ok=True)
                if xlsx_step_tracked:
                    if xlsx_error:
                        job_tracker.step_failed("renderXlsx", xlsx_error)
                    else:
                        job_tracker.step_succeeded("renderXlsx")
                if xlsx_path and not xlsx_error:
                    _publish_event_safe(
                        Event(
                            name="render.completed",
                            payload={"template_id": p.template_id, "kind": "xlsx"},
                            correlation_id=correlation_id,
                        )
                    )
        except ImportError:
            raise _http_error(
                501,
                "report_module_missing",
                (
                    "Report generation module not found. "
                    "Add .app.services.reports.ReportGenerate.fill_and_print("
                    "OBJ, TEMPLATE_PATH, DB_PATH, OUT_HTML, OUT_PDF, START_DATE, END_DATE, batch_ids=None)."
                ),
            )
        except Exception as exc:
            with contextlib.suppress(FileNotFoundError):
                tmp_html.unlink(missing_ok=True)
            with contextlib.suppress(FileNotFoundError):
                tmp_pdf.unlink(missing_ok=True)
            if tmp_docx is not None:
                with contextlib.suppress(FileNotFoundError):
                    tmp_docx.unlink(missing_ok=True)
            if tmp_xlsx is not None:
                with contextlib.suppress(FileNotFoundError):
                    tmp_xlsx.unlink(missing_ok=True)
            if job_tracker:
                job_tracker.step_failed("renderPdf", f"Report generation failed: {exc}")
            raise _http_error(500, "report_generation_failed", f"Report generation failed: {exc}")
    if job_tracker:
        job_tracker.step_succeeded("renderPdf")

    artifact_files = _artifact_map_from_paths(out_html, out_pdf, out_docx, out_xlsx)

    if job_tracker and job_tracker.has_step("finalize"):
        job_tracker.step_running("finalize", label="Finalize artifacts")
    write_artifact_manifest(
        tdir,
        step="reports_run",
        files=artifact_files,
        inputs=[str(contract_path), str(db_path)],
        correlation_id=correlation_id,
    )
    if job_tracker and job_tracker.has_step("finalize"):
        job_tracker.step_succeeded("finalize")

    manifest_data = load_manifest(tdir) or {}
    manifest_url = _manifest_endpoint(p.template_id, kind=kind)
    state_store.record_template_run(p.template_id, p.connection_id)
    state_store.set_last_used(p.connection_id, p.template_id)

    logger.info(
        "reports_run_complete",
        extra={
            "event": "reports_run_complete",
            "template_id": p.template_id,
            "html": str(out_html.name),
            "pdf": str(out_pdf.name),
            "docx": str(out_docx.name) if docx_path and out_docx else None,
            "xlsx": str(out_xlsx.name) if xlsx_path and out_xlsx else None,
            "correlation_id": correlation_id,
            "elapsed_ms": int((time.time() - run_started) * 1000),
        },
    )

    result = {
        "ok": True,
        "run_id": str(uuid.uuid4()),
        "template_id": p.template_id,
        "start_date": p.start_date,
        "end_date": p.end_date,
        "html_url": _artifact_url(out_html),
        "pdf_url": _artifact_url(out_pdf),
        "docx_url": _artifact_url(out_docx) if docx_path and out_docx else None,
        "xlsx_url": _artifact_url(out_xlsx) if xlsx_path and out_xlsx else None,
        "manifest_url": manifest_url,
        "manifest_produced_at": manifest_data.get("produced_at"),
        "correlation_id": correlation_id,
    }
    artifact_paths = {
        "html": out_html if out_html.exists() else None,
        "pdf": out_pdf if out_pdf.exists() else None,
        "docx": docx_path if docx_path and docx_path.exists() else None,
        "xlsx": xlsx_path if xlsx_path and xlsx_path.exists() else None,
    }
    return result, artifact_paths


def _maybe_send_email(
    p: RunPayload,
    artifact_paths: Mapping[str, Optional[Path]],
    run_result: Mapping[str, Any],
    *,
    kind: str,
    correlation_id: str | None,
    job_tracker: JobRunTracker | None = None,
) -> None:
    notification_strategy = NOTIFICATION_STRATEGIES.resolve("email")
    recipients = normalize_email_targets(p.email_recipients)
    email_step_tracked = bool(job_tracker and job_tracker.has_step("email"))
    if not recipients:
        if email_step_tracked:
            job_tracker.step_succeeded("email")
        return
    if email_step_tracked:
        job_tracker.step_running("email", label="Send notification email")
    attachments: list[Path] = []
    for key in ("pdf", "docx", "xlsx"):
        path = artifact_paths.get(key)
        if isinstance(path, Path) and path.exists():
            attachments.append(path)
    if not attachments:
        fallback = artifact_paths.get("html")
        if isinstance(fallback, Path) and fallback.exists():
            attachments.append(fallback)
    if not attachments:
        return
    template_record = state_store.get_template_record(p.template_id) or {}
    template_name = template_record.get("name") or p.template_id
    default_subject = f"Report run for {template_name}"
    subject = (p.email_subject or default_subject).strip()
    if not subject:
        subject = default_subject
    if p.email_message:
        body = p.email_message.strip()
    else:
        artifact_lines = []
        for key in ("pdf_url", "docx_url", "xlsx_url", "html_url"):
            url = run_result.get(key)
            if url:
                label = key.replace("_url", "").upper()
                artifact_lines.append(f"{label}: {url}")
        lines = [
            f"Template: {template_name} ({p.template_id})",
            f"Run kind: {kind}",
            f"Range: {p.start_date} -> {p.end_date}",
        ]
        if artifact_lines:
            lines.append("")
            lines.append("Artifacts:")
            lines.extend(artifact_lines)
        lines.append("")
        lines.append("This notification was generated automatically by NeuraReport.")
        body = "\n".join(lines)

    success = notification_strategy.send(
        recipients=recipients,
        subject=subject,
        body=body,
        attachments=attachments,
    )
    if email_step_tracked:
        if success:
            job_tracker.step_succeeded("email")
        else:
            job_tracker.step_failed("email", "Email delivery failed")
    _publish_event_safe(
        Event(
            name="notification.sent" if success else "notification.failed",
            payload={
                "template_id": p.template_id,
                "kind": kind,
                "recipients": len(recipients),
            },
            correlation_id=correlation_id,
        )
    )
    logger.info(
        "report_email_attempt",
        extra={
            "event": "report_email_attempt",
            "template_id": p.template_id,
            "recipients": len(recipients),
            "correlation_id": correlation_id,
            "status": "sent" if success else "skipped",
        },
    )


def _run_report_with_email(
    p: RunPayload,
    *,
    kind: str,
    correlation_id: str | None = None,
    job_tracker: JobRunTracker | None = None,
) -> dict:
    result, artifact_paths = _run_report_internal(p, kind=kind, correlation_id=correlation_id, job_tracker=job_tracker)
    _maybe_send_email(
        p,
        artifact_paths,
        result,
        kind=kind,
        correlation_id=correlation_id,
        job_tracker=job_tracker,
    )
    return result


def _run_report_job_sync(
    job_id: str,
    payload_data: Mapping[str, Any],
    kind: str,
    correlation_id: str,
    step_progress: Mapping[str, float],
) -> None:
    tracker = JobRunTracker(job_id, correlation_id=correlation_id, step_progress=step_progress)
    tracker.start()
    _publish_event_safe(Event(name="job.started", payload={"job_id": job_id, "kind": kind}, correlation_id=correlation_id))
    try:
        run_payload = RunPayload(**payload_data)
    except Exception as exc:
        tracker.fail(f"Invalid payload: {exc}")
        logger.exception(
            "report_job_payload_invalid",
            extra={"event": "report_job_payload_invalid", "job_id": job_id, "error": str(exc)},
        )
        return
    try:
        result = _run_report_with_email(run_payload, kind=kind, correlation_id=correlation_id, job_tracker=tracker)
    except HTTPException as exc:
        tracker.fail(_job_error_message(exc.detail))
        logger.exception(
            "report_job_http_error",
            extra={
                "event": "report_job_http_error",
                "job_id": job_id,
                "template_id": run_payload.template_id,
                "correlation_id": correlation_id,
            },
        )
        _publish_event_safe(
            Event(
                name="job.failed",
                payload={"job_id": job_id, "kind": kind, "error": _job_error_message(exc.detail)},
                correlation_id=correlation_id,
            )
        )
    except Exception as exc:
        tracker.fail(str(exc))
        logger.exception(
            "report_job_failed",
            extra={
                "event": "report_job_failed",
                "job_id": job_id,
                "template_id": run_payload.template_id,
                "correlation_id": correlation_id,
            },
        )
        _publish_event_safe(
            Event(
                name="job.failed",
                payload={"job_id": job_id, "kind": kind, "error": str(exc)},
                correlation_id=correlation_id,
            )
        )
    else:
        tracker.succeed(result)
        _publish_event_safe(
            Event(
                name="job.completed",
                payload={"job_id": job_id, "kind": kind, "status": "succeeded"},
                correlation_id=correlation_id,
            )
        )


def _schedule_report_job(
    job_id: str,
    payload_data: Mapping[str, Any],
    kind: str,
    correlation_id: str,
    step_progress: Mapping[str, float],
) -> None:
    _publish_event_safe(
        Event(
            name="job.enqueued",
            payload={"job_id": job_id, "kind": kind},
            correlation_id=correlation_id,
        )
    )

    async def runner() -> None:
        try:
            await asyncio.get_running_loop().run_in_executor(
                REPORT_JOB_EXECUTOR,
                _run_report_job_sync,
                job_id,
                payload_data,
                kind,
                correlation_id,
                step_progress,
            )
        except Exception:
            logger.exception(
                "report_job_task_failed",
                extra={"event": "report_job_task_failed", "job_id": job_id, "correlation_id": correlation_id},
            )

    task = asyncio.create_task(runner())
    _track_background_task(task)


async def queue_report_job(p: RunPayload, request: Request, *, kind: str) -> dict:
    correlation_id = getattr(request.state, "correlation_id", None) or f"job-{uuid.uuid4().hex[:10]}"
    steps = _build_job_steps(p, kind=kind)
    template_rec = state_store.get_template_record(p.template_id) or {}
    job_record = state_store.create_job(
        job_type="run_report",
        template_id=p.template_id,
        connection_id=p.connection_id,
        template_name=template_rec.get("name") or f"Template {p.template_id[:8]}",
        template_kind=template_rec.get("kind") or kind,
        schedule_id=p.schedule_id,
        correlation_id=correlation_id,
        steps=steps,
        meta={
            "start_date": p.start_date,
            "end_date": p.end_date,
            "docx": bool(p.docx),
            "xlsx": bool(p.xlsx),
        },
    )
    payload_data = p.dict()
    step_progress = _step_progress_from_steps(steps)
    _schedule_report_job(job_record["id"], payload_data, kind, correlation_id, step_progress)
    logger.info(
        "job_enqueued",
        extra={
            "event": "job_enqueued",
            "job_id": job_record["id"],
            "template_id": p.template_id,
            "template_kind": kind,
            "correlation_id": correlation_id,
        },
    )
    return {"job_id": job_record["id"]}


def scheduler_runner(payload: dict, kind: str) -> dict:
    run_payload = RunPayload(**payload)
    correlation_id = payload.get("correlation_id") or f"sched-{payload.get('schedule_id') or uuid.uuid4()}"
    return _run_report_with_email(run_payload, kind=kind, correlation_id=correlation_id)


def run_report(p: RunPayload, request: Request, *, kind: str = "pdf"):
    correlation_id = getattr(request.state, "correlation_id", None)
    return _run_report_with_email(p, kind=kind, correlation_id=correlation_id)
