from __future__ import annotations

import io
import os
import zipfile
from pathlib import Path
from typing import Iterable, Optional, Tuple


def _is_safe_member(member: zipfile.ZipInfo) -> bool:
    name = member.filename.replace("\\", "/")
    if name.startswith("/"):
        return False
    parts = [p for p in name.split("/") if p and p not in (".", "..")]
    return len(parts) > 0 and not any(p in ("..",) for p in parts)


def detect_zip_root(members: Iterable[str]) -> Optional[str]:
    roots = []
    for m in members:
        p = m.replace("\\", "/")
        if p.endswith("/"):
            p = p[:-1]
        parts = [seg for seg in p.split("/") if seg]
        if not parts:
            continue
        roots.append(parts[0])
    if not roots:
        return None
    first = roots[0]
    if all(r == first for r in roots):
        return first
    return None


def create_zip_from_dir(src_dir: Path, dest_zip: Path, *, include_root: bool = True) -> Path:
    src_dir = Path(src_dir).resolve()
    dest_zip = Path(dest_zip).resolve()
    dest_zip.parent.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(dest_zip, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        base_prefix = src_dir.name if include_root else ""
        for path in src_dir.rglob("*"):
            if path.is_dir():
                continue
            # Skip lock files
            if path.name.startswith(".lock."):
                continue
            rel = path.relative_to(src_dir)
            arcname = f"{base_prefix}/{rel.as_posix()}" if base_prefix else rel.as_posix()
            zf.write(path, arcname=arcname)
    return dest_zip


def extract_zip_to_dir(zip_path: Path, dest_dir: Path, *, strip_root: bool = True) -> Tuple[Path, str]:
    """
    Extract zip into dest_dir safely. Returns (extracted_root, root_name_in_zip).
    If strip_root is True and the zip has a single top-level folder, the contents of that
    folder are extracted directly under dest_dir. Otherwise, members are extracted with their
    original paths.
    """
    dest_dir = Path(dest_dir).resolve()
    dest_dir.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(zip_path, mode="r") as zf:
        root = detect_zip_root(m.filename for m in zf.infolist())
        for member in zf.infolist():
            if not _is_safe_member(member):
                continue
            name = member.filename.replace("\\", "/")
            if strip_root and root and name.startswith(root + "/"):
                rel = name[len(root) + 1 :]
            else:
                rel = name
            if not rel:
                continue
            target = dest_dir / rel
            if member.is_dir():
                target.mkdir(parents=True, exist_ok=True)
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            with zf.open(member, "r") as src, open(target, "wb") as dst:
                dst.write(src.read())
    return dest_dir, (root or "")

