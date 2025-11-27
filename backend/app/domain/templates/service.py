from __future__ import annotations

import asyncio
import contextlib
import logging
import tempfile
import zipfile
from dataclasses import dataclass, field, replace
from pathlib import Path
from typing import Optional

from fastapi import UploadFile

from backend.app.core.event_bus import Event, EventBus, logging_middleware, metrics_middleware
from backend.app.core.pipeline import PipelineRunner, PipelineStep
from backend.app.core.result import Result, err, ok
from backend.app.core.strategies import StrategyRegistry
from backend.app.domain.templates.errors import (
    TemplateExtractionError,
    TemplateImportError,
    TemplateLockedError,
    TemplateTooLargeError,
    TemplateZipInvalidError,
)
from backend.app.domain.templates.strategies import TemplateKindStrategy, build_template_kind_registry
from backend.app.services.state import state_store
from backend.app.services.utils import TemplateLockError, acquire_template_lock
from backend.app.services.utils.artifacts import load_manifest
from backend.app.services.utils.zip_tools import detect_zip_root, extract_zip_to_dir


@dataclass
class TemplateImportContext:
    upload: UploadFile
    display_name: Optional[str]
    correlation_id: Optional[str]
    tmp_path: Optional[Path] = None
    root: Optional[str] = None
    contains_excel: bool = False
    kind: Optional[str] = None
    template_id: Optional[str] = None
    template_dir: Optional[Path] = None
    name: Optional[str] = None
    artifacts: dict = field(default_factory=dict)
    manifest: dict = field(default_factory=dict)


class TemplateService:
    def __init__(
        self,
        uploads_root: Path,
        excel_uploads_root: Path,
        max_bytes: int,
        *,
        event_bus: Optional[EventBus] = None,
        kind_registry: Optional[StrategyRegistry[TemplateKindStrategy] | dict[str, TemplateKindStrategy]] = None,
    ) -> None:
        self.uploads_root = uploads_root
        self.excel_uploads_root = excel_uploads_root
        self.max_bytes = max_bytes
        self._semaphore = asyncio.Semaphore(4)
        self.logger = logging.getLogger("neura.templates")
        self.event_bus = event_bus or EventBus(
            middlewares=[logging_middleware(logging.getLogger("neura.events")), metrics_middleware(logging.getLogger("neura.events"))]
        )
        if isinstance(kind_registry, StrategyRegistry):
            self.kind_registry = kind_registry
        else:
            self.kind_registry = build_template_kind_registry(self.uploads_root, self.excel_uploads_root)
            if kind_registry:
                for key, strategy in kind_registry.items():
                    self.kind_registry.register(key, strategy)

    async def _write_upload(self, upload, dest: Path) -> int:
        size = 0
        dest.parent.mkdir(parents=True, exist_ok=True)
        try:
            with dest.open("wb") as fh:
                while True:
                    chunk = await upload.read(1024 * 1024)
                    if not chunk:
                        break
                    size += len(chunk)
                    if size > self.max_bytes:
                        raise TemplateTooLargeError(self.max_bytes)
                    fh.write(chunk)
        except Exception:
            with contextlib.suppress(Exception):
                dest.unlink(missing_ok=True)
            raise
        finally:
            with contextlib.suppress(Exception):
                await upload.seek(0)
        return size

    async def import_zip(
        self,
        upload: UploadFile,
        display_name: Optional[str],
        correlation_id: Optional[str],
    ):
        ctx = TemplateImportContext(upload=upload, display_name=display_name, correlation_id=correlation_id)
        tmp_paths: list[Path] = []

        async def _write(ctx: TemplateImportContext) -> Result[TemplateImportContext, TemplateImportError | Exception]:
            tmp_path = Path(tempfile.mktemp(suffix=".zip"))
            try:
                await self._write_upload(ctx.upload, tmp_path)
            except TemplateImportError as exc:
                return err(exc)
            except Exception as exc:
                return err(TemplateImportError(code="upload_failed", message="Upload failed", detail=str(exc)))
            tmp_paths.append(tmp_path)
            return ok(replace(ctx, tmp_path=tmp_path))

        def _inspect(ctx: TemplateImportContext) -> Result[TemplateImportContext, TemplateImportError]:
            if not ctx.tmp_path:
                return err(TemplateImportError(code="upload_missing", message="Temporary upload path missing"))
            try:
                with zipfile.ZipFile(ctx.tmp_path, "r") as zf:
                    members = list(zf.infolist())
                    root = detect_zip_root(m.filename for m in members)
                    contains_excel = any(Path(m.filename).name.lower() == "source.xlsx" for m in members)
            except Exception as exc:
                return err(TemplateZipInvalidError(detail=str(exc)))
            kind = "excel" if contains_excel else "pdf"
            name = display_name or root or (upload.filename or "template")
            return ok(
                replace(
                    ctx,
                    root=root,
                    contains_excel=contains_excel,
                    kind=kind,
                    name=name,
                )
            )

        def _allocate(ctx: TemplateImportContext) -> Result[TemplateImportContext, TemplateImportError]:
            if not ctx.kind:
                return err(TemplateImportError(code="kind_missing", message="Unable to infer template kind"))
            strategy = self.kind_registry.resolve(ctx.kind)
            template_id = strategy.generate_id(ctx.name)
            tdir = strategy.ensure_target_dir(template_id)
            return ok(replace(ctx, template_id=template_id, template_dir=tdir))

        def _extract(ctx: TemplateImportContext) -> Result[TemplateImportContext, TemplateImportError]:
            if not ctx.template_dir or not ctx.template_id or not ctx.tmp_path:
                return err(TemplateImportError(code="missing_context", message="Template import context incomplete"))
            try:
                lock_ctx = acquire_template_lock(ctx.template_dir, "import_zip", ctx.correlation_id)
            except TemplateLockError:
                return err(TemplateLockedError())

            with lock_ctx:
                try:
                    extract_zip_to_dir(ctx.tmp_path, ctx.template_dir, strip_root=True)
                except Exception as exc:
                    return err(TemplateExtractionError(detail=str(exc)))

                manifest = load_manifest(ctx.template_dir) or {}
                artifacts = manifest.get("artifacts") or {}
                template_name = ctx.name or f"Template {ctx.template_id[:6]}"
                status = "approved" if (ctx.template_dir / "contract.json").exists() else "draft"
                state_store.upsert_template(
                    ctx.template_id,
                    name=template_name,
                    status=status,
                    artifacts=artifacts,
                    connection_id=None,
                    mapping_keys=[],
                    template_type=ctx.kind,
                )

            return ok(
                replace(
                    ctx,
                    artifacts=artifacts,
                    manifest=manifest,
                    name=template_name,
                )
            )

        async def _emit_complete(
            ctx: TemplateImportContext,
        ) -> Result[TemplateImportContext, TemplateImportError]:
            await self.event_bus.publish(
                Event(
                    name="template.imported",
                    payload={
                        "template_id": ctx.template_id,
                        "kind": ctx.kind,
                        "artifacts": list((ctx.artifacts or {}).keys()),
                    },
                    correlation_id=ctx.correlation_id,
                )
            )
            return ok(ctx)

        steps = [
            PipelineStep("write_upload", _write),
            PipelineStep("inspect_zip", _inspect),
            PipelineStep("allocate_id", _allocate),
            PipelineStep("extract_and_persist", _extract),
            PipelineStep("emit_complete", _emit_complete),
        ]

        async with self._semaphore:
            runner = PipelineRunner(
                steps,
                bus=self.event_bus,
                logger=self.logger,
                correlation_id=correlation_id,
            )
            try:
                result = await runner.run(ctx)
            finally:
                with contextlib.suppress(Exception):
                    for path in tmp_paths:
                        path.unlink(missing_ok=True)

        if result.is_err:
            error = result.unwrap_err()
            if isinstance(error, TemplateImportError):
                raise error
            raise TemplateImportError(code="import_failed", message="Template import failed", detail=str(error))

        final_ctx = result.unwrap()
        return {
            "template_id": final_ctx.template_id,
            "name": final_ctx.name,
            "kind": final_ctx.kind,
            "artifacts": final_ctx.artifacts,
            "correlation_id": correlation_id,
        }
