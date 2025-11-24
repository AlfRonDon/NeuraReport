from __future__ import annotations

import asyncio
import contextlib
import tempfile
import uuid
import zipfile
from pathlib import Path
from typing import Optional

from fastapi import UploadFile

from backend.app.core.errors import AppError
from backend.app.services.state import state_store
from backend.app.services.utils import TemplateLockError, acquire_template_lock
from backend.app.services.utils.artifacts import load_manifest
from backend.app.services.utils.zip_tools import detect_zip_root, extract_zip_to_dir


class TemplateService:
    def __init__(self, uploads_root: Path, excel_uploads_root: Path, max_bytes: int) -> None:
        self.uploads_root = uploads_root
        self.excel_uploads_root = excel_uploads_root
        self.max_bytes = max_bytes
        self._semaphore = asyncio.Semaphore(4)

    def _normalize_id(self, hint: str, kind: str) -> str:
        base = "".join(ch.lower() if ch.isalnum() else "-" for ch in hint or "template").strip("-") or "template"
        return f"{base}-{uuid.uuid4().hex[:6]}-{kind}"

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
                        raise AppError(code="upload_too_large", message="Upload too large", status_code=413)
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
        async with self._semaphore:
            tmp_path = Path(tempfile.mktemp(suffix=".zip"))
            try:
                await self._write_upload(upload, tmp_path)
                try:
                    with zipfile.ZipFile(tmp_path, "r") as zf:
                        members = list(zf.infolist())
                        root = detect_zip_root(m.filename for m in members)
                        contains_excel = any(Path(m.filename).name.lower() == "source.xlsx" for m in members)
                except Exception as exc:
                    raise AppError(code="invalid_zip", message="Invalid zip file", detail=str(exc), status_code=400)

                kind = "excel" if contains_excel else "pdf"
                template_id = self._normalize_id(display_name or root or upload.filename or "template", kind)
                base_dir = self.excel_uploads_root if kind == "excel" else self.uploads_root
                tdir = (base_dir / template_id).resolve()
                tdir.mkdir(parents=True, exist_ok=True)

                try:
                    lock_ctx = acquire_template_lock(tdir, "import_zip", correlation_id)
                except TemplateLockError:
                    raise AppError(code="template_locked", message="Template is busy", status_code=409)

                with lock_ctx:
                    try:
                        extract_zip_to_dir(tmp_path, tdir, strip_root=True)
                    except Exception as exc:
                        raise AppError(code="import_failed", message="Failed to extract zip", detail=str(exc), status_code=400)

                    manifest = load_manifest(tdir) or {}
                    artifacts = manifest.get("artifacts") or {}
                    state_store.upsert_template(
                        template_id,
                        name=display_name or root or f"Template {template_id[:6]}",
                        status="approved" if (tdir / "contract.json").exists() else "draft",
                        artifacts=artifacts,
                        connection_id=None,
                        mapping_keys=[],
                        template_type=kind,
                    )
            finally:
                with contextlib.suppress(Exception):
                    tmp_path.unlink(missing_ok=True)

        return {
            "template_id": template_id,
            "name": display_name or root or f"Template {template_id[:6]}",
            "kind": kind,
            "artifacts": artifacts,
            "correlation_id": correlation_id,
        }
