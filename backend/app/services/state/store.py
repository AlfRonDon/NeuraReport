from __future__ import annotations

import base64
import hashlib
import json
import os
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, Mapping, Optional, Sequence

from cryptography.fernet import Fernet, InvalidToken

from ..utils import write_json_atomic


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _normalize_mapping_keys(values: Optional[Iterable[str]]) -> list[str]:
    if not values:
        return []
    seen: set[str] = set()
    normalized: list[str] = []
    for raw in values:
        text = str(raw or "").strip()
        if not text or text in seen:
            continue
        seen.add(text)
        normalized.append(text)
    return normalized


def _normalize_email_list(values: Optional[Iterable[str]]) -> list[str]:
    if not values:
        return []
    seen: set[str] = set()
    normalized: list[str] = []
    for raw in values:
        text = str(raw or "").strip()
        if not text or text in seen:
            continue
        seen.add(text)
        normalized.append(text)
    return normalized


class StateStore:
    """
    File-backed store that keeps connection credentials (encrypted), template metadata,
    and the last-used selection for report generation.
    """

    _STATE_FILENAME = "state.json"
    _KEY_FILENAME = ".secret"

    def __init__(self, base_dir: Optional[Path] = None) -> None:
        base = Path(
            os.getenv("NEURA_STATE_DIR")
            or (base_dir if base_dir is not None else Path(__file__).resolve().parents[3] / "state")
        )
        base.mkdir(parents=True, exist_ok=True)
        self._base_dir = base
        self._state_path = self._base_dir / self._STATE_FILENAME
        self._key_path = self._base_dir / self._KEY_FILENAME
        self._fernet: Optional[Fernet] = None
        self._lock = threading.RLock()

    # ------------------------------------------------------------------
    # key management / encryption helpers
    # ------------------------------------------------------------------
    def _normalize_key(self, raw: str) -> bytes:
        key_bytes = raw.encode("utf-8")
        try:
            # raw may already be a fernet key
            Fernet(key_bytes)
            return key_bytes
        except ValueError:
            digest = hashlib.sha256(key_bytes).digest()
            return base64.urlsafe_b64encode(digest)

    def _ensure_key(self) -> Fernet:
        if self._fernet is not None:
            return self._fernet

        key_env = os.getenv("NEURA_STATE_SECRET")
        if key_env:
            key = self._normalize_key(key_env)
        elif self._key_path.exists():
            key = self._key_path.read_text(encoding="utf-8").strip().encode("utf-8")
        else:
            key = Fernet.generate_key()
            self._key_path.write_text(key.decode("utf-8"), encoding="utf-8")
            try:
                os.chmod(self._key_path, 0o600)
            except OSError:
                pass

        self._fernet = Fernet(key)
        return self._fernet

    def _encrypt(self, payload: dict) -> str:
        token = self._ensure_key().encrypt(json.dumps(payload).encode("utf-8"))
        return token.decode("utf-8")

    def _decrypt(self, token: str) -> dict:
        if not token:
            return {}
        try:
            data = self._ensure_key().decrypt(token.encode("utf-8"))
            return json.loads(data.decode("utf-8"))
        except (InvalidToken, json.JSONDecodeError, ValueError):
            return {}

    # ------------------------------------------------------------------
    # state IO helpers
    # ------------------------------------------------------------------
    def _default_state(self) -> dict:
        return {
            "connections": {},
            "templates": {},
            "last_used": {},
            "schedules": {},
            "jobs": {},
            "saved_charts": {},
        }

    def _read_state(self) -> dict:
        if not self._state_path.exists():
            return self._default_state()
        try:
            raw = json.loads(self._state_path.read_text(encoding="utf-8"))
        except Exception:
            return self._default_state()
        raw.setdefault("connections", {})
        raw.setdefault("templates", {})
        raw.setdefault("last_used", {})
        raw.setdefault("schedules", {})
        raw.setdefault("jobs", {})
        raw.setdefault("saved_charts", {})
        return raw

    def _write_state(self, state: dict) -> None:
        write_json_atomic(self._state_path, state, ensure_ascii=False, indent=2, step="state_store")

    # ------------------------------------------------------------------
    # connection helpers
    # ------------------------------------------------------------------
    def list_connections(self) -> list[dict]:
        with self._lock:
            state = self._read_state()
            return [self._sanitize_connection(rec) for rec in state["connections"].values()]

    def get_connection_record(self, conn_id: str) -> Optional[dict]:
        with self._lock:
            state = self._read_state()
            return state["connections"].get(conn_id)

    def get_latest_connection(self) -> Optional[dict]:
        with self._lock:
            state = self._read_state()
            if not state["connections"]:
                return None
            records = list(state["connections"].values())
            records.sort(key=lambda rec: rec.get("updated_at") or "", reverse=True)
            best = records[0]
            return {
                "id": best.get("id"),
                "database_path": best.get("database_path"),
                "name": best.get("name"),
                "db_type": best.get("db_type"),
            }

    def get_connection_secrets(self, conn_id: str) -> Optional[dict]:
        with self._lock:
            state = self._read_state()
            rec = state["connections"].get(conn_id)
            if not rec:
                return None
            secrets = self._decrypt(rec.get("secret") or "")
            if not secrets:
                return None
            secrets["database_path"] = rec.get("database_path")
            secrets["db_type"] = rec.get("db_type")
            secrets["name"] = rec.get("name")
            return secrets

    def upsert_connection(
        self,
        *,
        conn_id: Optional[str],
        name: str,
        db_type: str,
        database_path: str,
        secret_payload: Optional[dict],
        status: Optional[str] = None,
        latency_ms: Optional[float] = None,
        tags: Optional[Iterable[str]] = None,
    ) -> dict:
        conn_id = conn_id or str(uuid.uuid4())
        now = _now_iso()
        with self._lock:
            state = self._read_state()
            record = state["connections"].get(conn_id, {})
            created_at = record.get("created_at", now)
            # determine secret (reuse previous unless new payload supplied)
            if secret_payload is not None:
                secret_value = self._encrypt(secret_payload)
            else:
                secret_value = record.get("secret") or ""
            if database_path:
                db_path_value = str(database_path)
            else:
                db_path_value = str(record.get("database_path") or "")
            record.update(
                {
                    "id": conn_id,
                    "name": name,
                    "db_type": db_type,
                    "database_path": db_path_value,
                    "secret": secret_value,
                    "updated_at": now,
                    "created_at": created_at,
                    "status": status or record.get("status") or "unknown",
                    "last_connected_at": record.get("last_connected_at"),
                    "last_latency_ms": record.get("last_latency_ms"),
                    "tags": sorted(set(tags or record.get("tags") or [])),
                }
            )
            state["connections"][conn_id] = record
            self._write_state(state)
            return self._sanitize_connection(record)

    def record_connection_ping(
        self,
        conn_id: str,
        *,
        status: str,
        detail: Optional[str],
        latency_ms: Optional[float],
    ) -> None:
        now = _now_iso()
        with self._lock:
            state = self._read_state()
            record = state["connections"].get(conn_id)
            if not record:
                return
            record["status"] = status
            record["last_connected_at"] = now
            record["last_latency_ms"] = latency_ms
            record["last_detail"] = detail
            record["updated_at"] = now
            state["connections"][conn_id] = record
            self._write_state(state)

    def delete_connection(self, conn_id: str) -> bool:
        with self._lock:
            state = self._read_state()
            if conn_id not in state["connections"]:
                return False
            del state["connections"][conn_id]
            if state.get("last_used", {}).get("connection_id") == conn_id:
                state["last_used"]["connection_id"] = None
            self._write_state(state)
            return True

    def _sanitize_connection(self, rec: Dict[str, Any]) -> dict:
        return {
            "id": rec.get("id"),
            "name": rec.get("name"),
            "db_type": rec.get("db_type"),
            "status": rec.get("status") or "unknown",
            "lastConnected": rec.get("last_connected_at"),
            "lastLatencyMs": rec.get("last_latency_ms"),
            "hasCredentials": bool(rec.get("secret")),
            "summary": self._summarize_path(rec.get("database_path")),
            "tags": list(rec.get("tags") or []),
            "createdAt": rec.get("created_at"),
            "updatedAt": rec.get("updated_at"),
            "details": rec.get("last_detail"),
        }

    def _summarize_path(self, path: Optional[str]) -> Optional[str]:
        if not path:
            return None
        try:
            p = Path(path)
            if p.name:
                return p.name
            return str(p)
        except Exception:
            return path

    # ------------------------------------------------------------------
    # template helpers
    # ------------------------------------------------------------------
    def list_templates(self) -> list[dict]:
        with self._lock:
            state = self._read_state()
            return [self._sanitize_template(rec) for rec in state["templates"].values()]

    def get_template_record(self, template_id: str) -> Optional[dict]:
        with self._lock:
            state = self._read_state()
            return state["templates"].get(template_id)

    def upsert_template(
        self,
        template_id: str,
        *,
        name: str,
        status: str,
        artifacts: Optional[dict] = None,
        tags: Optional[Iterable[str]] = None,
        connection_id: Optional[str] = None,
        mapping_keys: Optional[Iterable[str]] = None,
        template_type: Optional[str] = None,
    ) -> dict:
        tid = template_id
        now = _now_iso()
        with self._lock:
            state = self._read_state()
            record = state["templates"].get(tid, {})
            created_at = record.get("created_at", now)
            existing_artifacts = record.get("artifacts") or {}
            merged_artifacts = {**existing_artifacts, **(artifacts or {})}
            kind = template_type or record.get("kind") or "pdf"
            record.update(
                {
                    "id": tid,
                    "name": name,
                    "status": status,
                    "artifacts": {k: v for k, v in merged_artifacts.items() if v},
                    "updated_at": now,
                    "created_at": created_at,
                    "tags": sorted(set(tags or record.get("tags") or [])),
                    "last_connection_id": connection_id or record.get("last_connection_id"),
                    "kind": kind,
                }
            )
            if mapping_keys is not None:
                record["mapping_keys"] = _normalize_mapping_keys(mapping_keys)
            elif "mapping_keys" not in record:
                record["mapping_keys"] = []
            state["templates"][tid] = record
            self._write_state(state)
            return self._sanitize_template(record)

    def record_template_run(self, template_id: str, connection_id: Optional[str]) -> None:
        now = _now_iso()
        with self._lock:
            state = self._read_state()
            record = state["templates"].get(template_id)
            if not record:
                return
            record["last_run_at"] = now
            if connection_id:
                record["last_connection_id"] = connection_id
            record["updated_at"] = now
            state["templates"][template_id] = record
            self._write_state(state)

    def delete_template(self, template_id: str) -> bool:
        with self._lock:
            state = self._read_state()
            removed = state["templates"].pop(template_id, None)
            if removed is None:
                return False
            last_used = state.get("last_used") or {}
            if last_used.get("template_id") == template_id:
                last_used["template_id"] = None
                last_used["updated_at"] = _now_iso()
                state["last_used"] = last_used
            saved_charts = state.get("saved_charts") or {}
            drop_ids = [sid for sid, rec in saved_charts.items() if rec.get("template_id") == template_id]
            for sid in drop_ids:
                saved_charts.pop(sid, None)
            self._write_state(state)
            return True

    def update_template_generator(
        self,
        template_id: str,
        *,
        dialect: Optional[str] = None,
        params: Optional[Mapping[str, Any]] = None,
        invalid: Optional[bool] = None,
        needs_user_fix: Optional[Iterable[Any]] = None,
        summary: Optional[Mapping[str, Any]] = None,
        dry_run: Optional[Any] = None,
        cached: Optional[bool] = None,
    ) -> Optional[dict]:
        now = _now_iso()
        with self._lock:
            state = self._read_state()
            record = state["templates"].get(template_id)
            if not record:
                return None
            generator = dict(record.get("generator") or {})
            if dialect is not None:
                generator["dialect"] = dialect
            if params is not None:
                generator["params"] = dict(params)
            if invalid is not None:
                generator["invalid"] = bool(invalid)
            if needs_user_fix is not None:
                cleaned = []
                for item in needs_user_fix:
                    text = str(item).strip()
                    if text:
                        cleaned.append(text)
                generator["needs_user_fix"] = cleaned
            if summary is not None:
                generator["summary"] = dict(summary)
            if dry_run is not None:
                generator["dry_run"] = dry_run
            if cached is not None:
                generator["cached"] = bool(cached)
            generator["updated_at"] = now
            record["generator"] = generator
            record["updated_at"] = now
            state["templates"][template_id] = record
            self._write_state(state)
            return self._sanitize_template(record)

    def _sanitize_template(self, rec: Dict[str, Any]) -> dict:
        artifacts = rec.get("artifacts") or {}
        mapping_keys = rec.get("mapping_keys") or []
        generator_raw = rec.get("generator") or {}
        generator_meta: Optional[dict] = None
        if generator_raw:
            generator_meta = {
                "dialect": generator_raw.get("dialect"),
                "invalid": generator_raw.get("invalid"),
                "needsUserFix": list(generator_raw.get("needs_user_fix") or []),
                "params": generator_raw.get("params"),
                "summary": generator_raw.get("summary"),
                "dryRun": generator_raw.get("dry_run"),
                "cached": generator_raw.get("cached"),
                "updatedAt": generator_raw.get("updated_at"),
            }
            if generator_meta["needsUserFix"] is None:
                generator_meta["needsUserFix"] = []
            generator_meta = {
                key: value
                for key, value in generator_meta.items()
                if value is not None or key in {"invalid", "needsUserFix"}
            }
        return {
            "id": rec.get("id"),
            "name": rec.get("name"),
            "status": rec.get("status"),
            "kind": rec.get("kind") or "pdf",
            "tags": list(rec.get("tags") or []),
            "createdAt": rec.get("created_at"),
            "updatedAt": rec.get("updated_at"),
            "lastRunAt": rec.get("last_run_at"),
            "lastConnectionId": rec.get("last_connection_id"),
            "mappingKeys": list(mapping_keys),
            "artifacts": {k: v for k, v in artifacts.items() if v},
            "generator": generator_meta,
        }

    def _sanitize_saved_chart(self, rec: Optional[dict]) -> Optional[dict]:
        if not rec:
            return None
        spec = rec.get("spec") or {}
        sanitized_spec = json.loads(json.dumps(spec))
        return {
            "id": rec.get("id"),
            "template_id": rec.get("template_id"),
            "name": rec.get("name"),
            "spec": sanitized_spec,
            "created_at": rec.get("created_at"),
            "updated_at": rec.get("updated_at"),
        }

    def list_saved_charts(self, template_id: str) -> list[dict]:
        with self._lock:
            state = self._read_state()
            charts = [
                self._sanitize_saved_chart(rec)
                for rec in state.get("saved_charts", {}).values()
                if rec and rec.get("template_id") == template_id
            ]
            return [rec for rec in charts if rec]

    def get_saved_chart(self, chart_id: str) -> Optional[dict]:
        with self._lock:
            state = self._read_state()
            rec = (state.get("saved_charts") or {}).get(chart_id)
            return self._sanitize_saved_chart(rec)

    def create_saved_chart(self, template_id: str, name: str, spec: Mapping[str, Any]) -> dict:
        now = _now_iso()
        chart_id = str(uuid.uuid4())
        spec_payload = json.loads(json.dumps(spec))
        with self._lock:
            state = self._read_state()
            record = {
                "id": chart_id,
                "template_id": template_id,
                "name": name,
                "spec": spec_payload,
                "created_at": now,
                "updated_at": now,
            }
            state.setdefault("saved_charts", {})
            state["saved_charts"][chart_id] = record
            self._write_state(state)
            return self._sanitize_saved_chart(record)

    def update_saved_chart(
        self,
        chart_id: str,
        *,
        name: Optional[str] = None,
        spec: Optional[Mapping[str, Any]] = None,
    ) -> Optional[dict]:
        now = _now_iso()
        with self._lock:
            state = self._read_state()
            record = (state.get("saved_charts") or {}).get(chart_id)
            if not record:
                return None
            if name is not None:
                record["name"] = name
            if spec is not None:
                record["spec"] = json.loads(json.dumps(spec))
            record["updated_at"] = now
            state["saved_charts"][chart_id] = record
            self._write_state(state)
            return self._sanitize_saved_chart(record)

    def delete_saved_chart(self, chart_id: str) -> bool:
        with self._lock:
            state = self._read_state()
            saved = state.get("saved_charts") or {}
            removed = saved.pop(chart_id, None)
            if not removed:
                return False
            self._write_state(state)
            return True

    def _sanitize_schedule(self, rec: Optional[dict]) -> Optional[dict]:
        if not rec:
            return None
        sanitized = dict(rec)
        sanitized["email_recipients"] = _normalize_email_list(rec.get("email_recipients"))
        sanitized["email_subject"] = rec.get("email_subject")
        sanitized["email_message"] = rec.get("email_message")
        key_values = rec.get("key_values")
        sanitized["key_values"] = dict(key_values or {})
        batches = rec.get("batch_ids")
        if isinstance(batches, (list, tuple)):
            sanitized["batch_ids"] = [str(b) for b in batches if str(b).strip()]
        else:
            sanitized["batch_ids"] = []
        sanitized["last_run_artifacts"] = dict(rec.get("last_run_artifacts") or {})
        return sanitized

    def list_schedules(self) -> list[dict]:
        with self._lock:
            state = self._read_state()
            return [self._sanitize_schedule(rec) for rec in state["schedules"].values() if rec]

    def get_schedule(self, schedule_id: str) -> Optional[dict]:
        with self._lock:
            state = self._read_state()
            rec = state["schedules"].get(schedule_id)
            return self._sanitize_schedule(rec)

    def create_schedule(
        self,
        *,
        name: Optional[str],
        template_id: str,
        template_name: str,
        template_kind: str,
        connection_id: Optional[str],
        connection_name: Optional[str],
        start_date: str,
        end_date: str,
        key_values: Optional[Mapping[str, Any]],
        batch_ids: Optional[Iterable[str]],
        docx: bool,
        xlsx: bool,
        email_recipients: Optional[Iterable[str]],
        email_subject: Optional[str],
        email_message: Optional[str],
        frequency: str,
        interval_minutes: int,
        next_run_at: str,
        first_run_at: str,
        active: bool = True,
    ) -> dict:
        schedule_id = str(uuid.uuid4())
        now = _now_iso()
        with self._lock:
            state = self._read_state()
            record = {
                "id": schedule_id,
                "name": (name or "").strip() or template_name,
                "template_id": template_id,
                "template_name": template_name,
                "template_kind": template_kind,
                "connection_id": connection_id,
                "connection_name": connection_name,
                "start_date": start_date,
                "end_date": end_date,
                "key_values": dict(key_values or {}),
                "batch_ids": [str(b) for b in (batch_ids or []) if str(b).strip()],
                "docx": bool(docx),
                "xlsx": bool(xlsx),
                "email_recipients": _normalize_email_list(email_recipients),
                "email_subject": (email_subject or "").strip() or None,
                "email_message": (email_message or "").strip() or None,
                "frequency": frequency,
                "interval_minutes": max(int(interval_minutes or 0), 1),
                "next_run_at": next_run_at,
                "first_run_at": first_run_at,
                "last_run_at": None,
                "last_run_status": None,
                "last_run_error": None,
                "last_run_artifacts": {},
                "active": bool(active),
                "created_at": now,
                "updated_at": now,
            }
            state["schedules"][schedule_id] = record
            self._write_state(state)
            return self._sanitize_schedule(record)

    def delete_schedule(self, schedule_id: str) -> bool:
        with self._lock:
            state = self._read_state()
            removed = state["schedules"].pop(schedule_id, None)
            if not removed:
                return False
            self._write_state(state)
            return True

    def update_schedule(self, schedule_id: str, **changes: Any) -> Optional[dict]:
        with self._lock:
            state = self._read_state()
            record = state["schedules"].get(schedule_id)
            if not record:
                return None
            for key, value in changes.items():
                if key == "email_recipients":
                    record[key] = _normalize_email_list(value)
                elif key in {"email_subject", "email_message"}:
                    record[key] = (value or "").strip() or None
                elif key == "key_values":
                    record[key] = dict(value or {})
                elif key == "batch_ids":
                    record[key] = [str(b) for b in (value or []) if str(b).strip()]
                else:
                    record[key] = value
            record["updated_at"] = _now_iso()
            state["schedules"][schedule_id] = record
            self._write_state(state)
            return self._sanitize_schedule(record)

    def record_schedule_run(
        self,
        schedule_id: str,
        *,
        started_at: str,
        finished_at: str,
        status: str,
        next_run_at: Optional[str],
        artifacts: Optional[Mapping[str, Any]] = None,
        error: Optional[str] = None,
    ) -> Optional[dict]:
        with self._lock:
            state = self._read_state()
            record = state["schedules"].get(schedule_id)
            if not record:
                return None
            record["last_run_at"] = finished_at
            record["last_run_status"] = status
            record["last_run_error"] = error
            record["last_run_artifacts"] = dict(artifacts or {})
            if next_run_at:
                record["next_run_at"] = next_run_at
            record["updated_at"] = _now_iso()
            state["schedules"][schedule_id] = record
            self._write_state(state)
            return self._sanitize_schedule(record)

    # ------------------------------------------------------------------
    # last-used helpers
    # ------------------------------------------------------------------
    # Jobs helpers
    # ------------------------------------------------------------------
    def _sanitize_job_step(self, step: Optional[dict]) -> Optional[dict]:
        if not step:
            return None
        return {
            "id": step.get("id"),
            "name": step.get("name"),
            "label": step.get("label") or step.get("name"),
            "status": step.get("status") or "queued",
            "progress": step.get("progress"),
            "createdAt": step.get("created_at"),
            "startedAt": step.get("started_at"),
            "finishedAt": step.get("finished_at"),
            "error": step.get("error"),
        }

    def _sanitize_job(self, rec: Optional[dict]) -> Optional[dict]:
        if not rec:
            return None
        steps_raw = rec.get("steps") or []
        steps: list[dict] = []
        for step in steps_raw:
            sanitized = self._sanitize_job_step(step)
            if sanitized:
                steps.append(sanitized)
        return {
            "id": rec.get("id"),
            "type": rec.get("type") or "run_report",
            "status": rec.get("status") or "queued",
            "templateId": rec.get("template_id"),
            "templateName": rec.get("template_name"),
            "templateKind": rec.get("template_kind") or "pdf",
            "connectionId": rec.get("connection_id"),
            "scheduleId": rec.get("schedule_id"),
            "correlationId": rec.get("correlation_id"),
            "progress": rec.get("progress") or 0,
            "error": rec.get("error"),
            "result": dict(rec.get("result") or {}),
            "createdAt": rec.get("created_at"),
            "queuedAt": rec.get("queued_at"),
            "startedAt": rec.get("started_at"),
            "finishedAt": rec.get("finished_at"),
            "updatedAt": rec.get("updated_at"),
            "steps": steps,
        }

    def create_job(
        self,
        *,
        job_type: str,
        template_id: Optional[str] = None,
        connection_id: Optional[str] = None,
        template_name: Optional[str] = None,
        template_kind: Optional[str] = None,
        schedule_id: Optional[str] = None,
        correlation_id: Optional[str] = None,
        steps: Optional[Iterable[Mapping[str, Any]]] = None,
        meta: Optional[Mapping[str, Any]] = None,
    ) -> dict:
        job_id = str(uuid.uuid4())
        now = _now_iso()
        with self._lock:
            state = self._read_state()
            templates = state.get("templates") or {}
            tpl_record = templates.get(template_id) or {}
            tpl_name = template_name or tpl_record.get("name") or template_id
            tpl_kind = template_kind or tpl_record.get("kind") or "pdf"
            step_records: list[dict] = []
            for raw in steps or []:
                name_raw = raw.get("name") if isinstance(raw, Mapping) else None
                name = str(name_raw or "").strip()
                if not name:
                    continue
                step_id = str(raw.get("id") or uuid.uuid4())
                label_raw = raw.get("label") if isinstance(raw, Mapping) else None
                label = str(label_raw or "").strip() or name
                status_raw = raw.get("status") if isinstance(raw, Mapping) else None
                status = (str(status_raw or "") or "queued").strip().lower() or "queued"
                progress_raw = raw.get("progress") if isinstance(raw, Mapping) else None
                try:
                    progress_val = float(progress_raw)
                except (TypeError, ValueError):
                    progress_val = 0.0
                step_records.append(
                    {
                        "id": step_id,
                        "name": name,
                        "label": label,
                        "status": status,
                        "progress": max(0.0, min(progress_val, 100.0)),
                        "created_at": now,
                        "started_at": None,
                        "finished_at": None,
                        "error": None,
                    }
                )
            jobs = state.get("jobs") or {}
            record = {
                "id": job_id,
                "type": str(job_type or "run_report"),
                "template_id": template_id,
                "template_name": tpl_name,
                "template_kind": tpl_kind,
                "connection_id": connection_id,
                "schedule_id": schedule_id,
                "correlation_id": correlation_id,
                "status": "queued",
                "progress": 0.0,
                "error": None,
                "result": {},
                "steps": step_records,
                "created_at": now,
                "queued_at": now,
                "started_at": None,
                "finished_at": None,
                "updated_at": now,
                "meta": dict(meta or {}),
            }
            jobs[job_id] = record
            state["jobs"] = jobs
            self._write_state(state)
            sanitized = self._sanitize_job(record)
            assert sanitized is not None
            return sanitized

    def list_jobs(
        self,
        *,
        statuses: Optional[Iterable[str]] = None,
        types: Optional[Iterable[str]] = None,
        limit: int = 50,
        active_only: bool = False,
    ) -> list[dict]:
        with self._lock:
            state = self._read_state()
            jobs = list((state.get("jobs") or {}).values())
            # newest first
            jobs.sort(key=lambda rec: rec.get("created_at") or "", reverse=True)
            status_filter = {str(s).strip().lower() for s in (statuses or []) if str(s).strip()}
            type_filter = {str(t).strip() for t in (types or []) if str(t).strip()}
            out: list[dict] = []
            for rec in jobs:
                status_raw = rec.get("status") or ""
                status_norm = str(status_raw).strip().lower()
                if active_only and status_norm in {"succeeded", "failed", "cancelled"}:
                    continue
                if status_filter and status_norm not in status_filter:
                    continue
                type_raw = rec.get("type") or ""
                if type_filter and str(type_raw) not in type_filter:
                    continue
                sanitized = self._sanitize_job(rec)
                if sanitized:
                    out.append(sanitized)
                if limit and len(out) >= limit:
                    break
            return out

    def get_job(self, job_id: str) -> Optional[dict]:
        with self._lock:
            state = self._read_state()
            rec = (state.get("jobs") or {}).get(job_id)
            return self._sanitize_job(rec)

    def _update_job_record(self, job_id: str, mutator) -> Optional[dict]:
        with self._lock:
            state = self._read_state()
            jobs = state.get("jobs") or {}
            record = jobs.get(job_id)
            if not record:
                return None
            changed = mutator(record)
            if not changed:
                # still touch updated_at for visibility
                record["updated_at"] = _now_iso()
            jobs[job_id] = record
            state["jobs"] = jobs
            self._write_state(state)
            return self._sanitize_job(record)

    def record_job_start(self, job_id: str) -> Optional[dict]:
        def mutator(rec: dict) -> bool:
            now = _now_iso()
            updated = False
            if not rec.get("started_at"):
                rec["started_at"] = now
                updated = True
            if rec.get("status") != "running":
                rec["status"] = "running"
                updated = True
            if rec.get("progress") is None:
                rec["progress"] = 0.0
            rec["updated_at"] = now
            return updated

        return self._update_job_record(job_id, mutator)

    def record_job_progress(self, job_id: str, progress: float) -> Optional[dict]:
        try:
            value = float(progress)
        except (TypeError, ValueError):
            value = 0.0
        clamped = max(0.0, min(value, 100.0))

        def mutator(rec: dict) -> bool:
            now = _now_iso()
            prev = rec.get("progress")
            if prev is not None and float(prev) == clamped:
                rec["updated_at"] = now
                return False
            rec["progress"] = clamped
            rec["updated_at"] = now
            return True

        return self._update_job_record(job_id, mutator)

    def record_job_completion(
        self,
        job_id: str,
        *,
        status: str,
        error: Optional[str] = None,
        result: Optional[Mapping[str, Any]] = None,
    ) -> Optional[dict]:
        status_norm = (status or "").strip().lower()
        if status_norm not in {"succeeded", "failed", "cancelled"}:
            status_norm = "failed"

        def mutator(rec: dict) -> bool:
            now = _now_iso()
            changed = False
            if rec.get("status") != status_norm:
                rec["status"] = status_norm
                changed = True
            if not rec.get("finished_at"):
                rec["finished_at"] = now
                changed = True
            if status_norm == "succeeded" and (rec.get("progress") or 0) < 100:
                rec["progress"] = 100.0
                changed = True
            if error is not None:
                rec["error"] = str(error)
                changed = True
            if result is not None:
                rec["result"] = dict(result)
                changed = True
            rec["updated_at"] = now
            return changed

        return self._update_job_record(job_id, mutator)

    def record_job_step(
        self,
        job_id: str,
        name: str,
        *,
        status: Optional[str] = None,
        error: Optional[str] = None,
        progress: Optional[float] = None,
        label: Optional[str] = None,
    ) -> Optional[dict]:
        step_name = (name or "").strip()
        if not step_name:
            return None
        status_norm = (status or "").strip().lower() if status is not None else None

        def mutator(rec: dict) -> bool:
            now = _now_iso()
            steps = list(rec.get("steps") or [])
            target = None
            for step in steps:
                if step.get("name") == step_name:
                    target = step
                    break
            if target is None:
                target = {
                    "id": str(uuid.uuid4()),
                    "name": step_name,
                    "label": label or step_name,
                    "status": status_norm or "queued",
                    "progress": 0.0,
                    "created_at": now,
                    "started_at": None,
                    "finished_at": None,
                    "error": None,
                }
                steps.append(target)
            else:
                if label is not None:
                    target["label"] = label
                if status_norm is not None:
                    previous_status = str(target.get("status") or "").strip().lower()
                    target["status"] = status_norm
                    if status_norm == "running" and not target.get("started_at"):
                        target["started_at"] = now
                    if status_norm in {"succeeded", "failed", "cancelled"} and not target.get(
                        "finished_at"
                    ):
                        target["finished_at"] = now
                if error is not None:
                    target["error"] = str(error)
                if progress is not None:
                    try:
                        value = float(progress)
                    except (TypeError, ValueError):
                        value = 0.0
                    target["progress"] = max(0.0, min(value, 100.0))
            rec["steps"] = steps
            rec["updated_at"] = now
            return True

        return self._update_job_record(job_id, mutator)

    # ------------------------------------------------------------------
    # last-used helpers
    # ------------------------------------------------------------------
    def get_last_used(self) -> dict:
        with self._lock:
            state = self._read_state()
            data = state.get("last_used") or {}
            return {
                "connection_id": data.get("connection_id"),
                "template_id": data.get("template_id"),
                "updated_at": data.get("updated_at"),
            }

    def set_last_used(self, connection_id: Optional[str], template_id: Optional[str]) -> dict:
        now = _now_iso()
        with self._lock:
            state = self._read_state()
            state["last_used"] = {
                "connection_id": connection_id,
                "template_id": template_id,
                "updated_at": now,
            }
            self._write_state(state)
            return state["last_used"]


state_store = StateStore()
