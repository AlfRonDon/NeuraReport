from __future__ import annotations

import base64
import hashlib
import json
import os
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, Mapping, Optional

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
        return {"connections": {}, "templates": {}, "last_used": {}}

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
    ) -> dict:
        tid = template_id
        now = _now_iso()
        with self._lock:
            state = self._read_state()
            record = state["templates"].get(tid, {})
            created_at = record.get("created_at", now)
            existing_artifacts = record.get("artifacts") or {}
            merged_artifacts = {**existing_artifacts, **(artifacts or {})}
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
            "tags": list(rec.get("tags") or []),
            "createdAt": rec.get("created_at"),
            "updatedAt": rec.get("updated_at"),
            "lastRunAt": rec.get("last_run_at"),
            "lastConnectionId": rec.get("last_connection_id"),
            "mappingKeys": list(mapping_keys),
            "artifacts": {k: v for k, v in artifacts.items() if v},
            "generator": generator_meta,
        }

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
