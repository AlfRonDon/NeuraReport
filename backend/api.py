# api.py
from __future__ import annotations

import os, json, time, uuid, shutil, tempfile, re
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# ✅ DB helpers
from .app.services.connections.db_connection import (
    resolve_db_path,
    verify_sqlite,
    save_connection,
)

# ✅ Template building helpers (TemplateVerify.py)
from .app.services.templates.TemplateVerify import (
    pdf_to_pngs,
    request_schema_for_page,
    request_initial_html,
    save_html,
)

# ✅ Header-mapping helpers
from .app.services.mapping.HeaderMapping import (
    get_parent_child_info,
    approval_errors,
)

# Prefer full-HTML mapper if present; else fallback to legacy
try:
    from .app.services.mapping.HeaderMapping import (
        llm_pick_with_chat_completions_full_html as _llm_map_full_html,
    )
except Exception:
    from .app.services.mapping.HeaderMapping import (
        llm_pick_with_chat_completions as _legacy_llm_scope_mapper,
    )

    def _llm_map_full_html(full_html: str, catalog, image_contents=None):
        return _legacy_llm_scope_mapper(full_html, catalog, image_contents)

# ✅ Discovery helpers (build_or_load_contract is re-exported here but implemented in auto_fill.py)
from .app.services.reports.discovery import (
    build_or_load_contract,
    discover_batches_and_counts,
)

# ✅ Auto-fill after Approve Mapping
from .app.services.mapping.auto_fill import run_after_approve


# ---------- App & CORS ----------
app = FastAPI(title="NeuraReport API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten for prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Static upload root ----------
APP_DIR = Path(__file__).parent.resolve()
UPLOAD_ROOT = APP_DIR / "uploads"
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_ROOT)), name="uploads")


# ---------- Health ----------
@app.get("/health")
def health():
    return {"status": "ok"}


# ---------- Models ----------
class TestPayload(BaseModel):
    db_url: Optional[str] = None
    db_type: Optional[str] = None
    database: Optional[str] = None


class MappingPayload(BaseModel):
    # UI currently posts { "<header or token>": "table.col" | "UNRESOLVED", ... }
    mapping: dict[str, str]


class RunPayload(BaseModel):
    template_id: str
    connection_id: Optional[str] = None
    start_date: str
    end_date: str
    batch_ids: Optional[list[str]] = None


class DiscoverPayload(BaseModel):
    template_id: str
    connection_id: Optional[str] = None
    start_date: str
    end_date: str


# ---------- Helpers for connections ----------
STORAGE = os.path.join(tempfile.gettempdir(), "neura_connections.jsonl")


def _lookup_connection(cid: str) -> Optional[dict]:
    if not os.path.exists(STORAGE):
        return None
    with open(STORAGE, "r", encoding="utf-8") as f:
        for line in f:
            try:
                rec = json.loads(line)
                if rec.get("id") == cid:
                    return rec.get("cfg")
            except Exception:
                continue
    return None


def _latest_connection_cfg() -> Optional[dict]:
    if not os.path.exists(STORAGE):
        return None
    last = None
    with open(STORAGE, "r", encoding="utf-8") as f:
        for line in f:
            try:
                rec = json.loads(line)
                last = rec.get("cfg") or rec
            except Exception:
                continue
    return last


def _db_path_from_payload_or_default(conn_id: Optional[str]) -> Path:
    if conn_id:
        cfg = _lookup_connection(conn_id)
        if cfg and cfg.get("database"):
            return Path(cfg["database"])
        try:
            return resolve_db_path(connection_id=conn_id, db_url=None, db_path=None)
        except Exception:
            pass

    env_db = os.getenv("NR_DEFAULT_DB") or os.getenv("DB_PATH")
    if env_db:
        return Path(env_db)

    cfg = _latest_connection_cfg()
    if cfg and cfg.get("database"):
        return Path(cfg["database"])

    raise HTTPException(
        status_code=400,
        detail="No database configured. Connect once or set NR_DEFAULT_DB/DB_PATH env.",
    )


# ---------- Mapping normalization (NEW) ----------
_TOKEN_RE = re.compile(r"^\s*\{\{?.+?\}?\}\s*$")


def _norm_placeholder(name: str) -> str:
    """Ensure we store a placeholder token form. If already {name} or {{name}}, keep it; else wrap in { }."""
    if _TOKEN_RE.match(name):
        return name.strip()
    core = name.strip()
    core = core.strip("{} ")
    return "{" + core + "}"


def _normalize_mapping_for_autofill(mapping: dict[str, str]) -> list[dict]:
    """
    Convert UI dict to the list format expected by auto_fill:
      [{"header": <key>, "placeholder": "{Token}", "mapping": "table.col"|"UNRESOLVED"}, ...]
    """
    out: list[dict] = []
    for k, v in mapping.items():
        out.append(
            {
                "header": k,
                "placeholder": _norm_placeholder(k),
                "mapping": v,
            }
        )
    return out


def _save_image_contents(template_id: str, contents: list[dict]) -> None:
    """
    Persist the Step-1 image_contents so later endpoints (e.g., /reports/discover)
    can reuse the exact same PDF image grounding.
    """
    tdir = UPLOAD_ROOT / template_id
    tdir.mkdir(parents=True, exist_ok=True)
    path = tdir / "_image_contents.json"
    try:
        path.write_text(json.dumps(contents, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        # non-fatal
        pass


def _load_image_contents(template_id: str) -> list[dict]:
    """
    Load previously saved image_contents; returns [] if missing.
    """
    path = UPLOAD_ROOT / template_id / "_image_contents.json"
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except Exception:
        return []


# ---------- Routes ----------
@app.post("/connections/test")
def test_connection(p: TestPayload):
    t0 = time.time()
    try:
        db_path: Path = resolve_db_path(
            connection_id=None,
            db_url=p.db_url,
            db_path=p.database if (p.db_type or "").lower() == "sqlite" else None,
        )
        verify_sqlite(db_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    cid = save_connection({"db_type": "sqlite", "database": str(db_path.resolve())})

    return {
        "ok": True,
        "latency_ms": int((time.time() - t0) * 1000),
        "connection_id": cid,
        "normalized": {
            "db_type": "sqlite",
            "database": str(db_path.resolve()),
        },
    }


@app.post("/templates/verify")
async def verify_template(
    file: UploadFile = File(...),
    connection_id: str = Form(...),
    refine_iters: int = Form(0),
):
    # 0) template folder
    tid = str(uuid.uuid4())
    tdir = UPLOAD_ROOT / tid
    tdir.mkdir(parents=True, exist_ok=True)

    # 1) save PDF
    pdf_path = tdir / "source.pdf"
    with pdf_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    # 2) PDF → PNG
    try:
        ref_pngs = pdf_to_pngs(pdf_path, tdir, dpi=int(os.getenv("PDF_DPI", "400")))
        if not ref_pngs:
            raise RuntimeError("No pages rendered from PDF")
        png_path = ref_pngs[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF→PNG failed: {e}")

    # 3) schema
    try:
        schema = request_schema_for_page(png_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Schema inference failed: {e}")

    # 4) initial HTML
    try:
        html_text = request_initial_html(png_path, schema)
        html_path = tdir / "template_p1.html"
        save_html(html_path, html_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Initial HTML generation failed: {e}")

    return {
        "template_id": tid,
        "schema": schema,
        "artifacts": {
            "pdf_url": f"/uploads/{tid}/source.pdf",
            "png_url": f"/uploads/{tid}/reference_p1.png",
            "html_url": f"/uploads/{tid}/template_p1.html",
        },
    }


@app.post("/templates/{template_id}/mapping/preview")
def mapping_preview(template_id: str, connection_id: str):
    # 1) DB
    try:
        db_path: Path = resolve_db_path(
            connection_id=connection_id, db_url=None, db_path=None
        )
        verify_sqlite(db_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid connection_id: {e}")

    # 2) HTML
    tdir = UPLOAD_ROOT / template_id
    html_path = tdir / "report_final.html"
    if not html_path.exists():
        html_path = tdir / "template_p1.html"
    if not html_path.exists():
        raise HTTPException(status_code=404, detail="Run /templates/verify first")
    template_html = html_path.read_text(encoding="utf-8", errors="ignore")

    # 3) catalog
    try:
        info = get_parent_child_info(db_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB introspection failed: {e}")

    parent = info["parent table"]
    child = info["child table"]
    catalog = [*(f"{parent}.{c}" for c in info["parent_columns"])]
    catalog += [*(f"{child}.{c}" for c in info["child_columns"])]

    # 4) map
    try:
        mapping = _llm_map_full_html(template_html, catalog, image_contents=None)
        errors = approval_errors(mapping)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Auto-mapping failed: {e}")

    return {
        "mapping": mapping,
        "errors": errors,
        "schema_info": info,
        "catalog": catalog,
    }


@app.post("/templates/{template_id}/mapping/approve")
def mapping_approve(template_id: str, payload: MappingPayload):
    """
    Save approved mapping as a LIST of objects that include header+placeholder+mapping,
    then run the auto-fill to pre-resolve UNRESOLVED placeholders (leaving totals & mapped intact).
    Also persists image_contents from Step-1 for reuse in /reports/discover.
    """
    tdir = UPLOAD_ROOT / template_id
    if not tdir.exists():
        raise HTTPException(status_code=404, detail="template_id not found")

    # 1) normalize and save
    normalized_list = _normalize_mapping_for_autofill(payload.mapping)
    out = tdir / "mapping_pdf_labels.json"
    try:
        out.write_text(
            json.dumps(normalized_list, indent=2, ensure_ascii=False), encoding="utf-8"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Save mapping failed: {e}")

    # 2) run post-approve prefill
    try:
        result = run_after_approve(template_id=template_id, uploads_root=UPLOAD_ROOT)
        # Persist image_contents for later contract step
        imgc = result.get("image_contents") or []
        if isinstance(imgc, list):
            _save_image_contents(template_id, imgc)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Auto-fill after approve failed: {e}")

    # 3) response (include template_html_url for live preview refresh)
    return {
        "ok": True,
        "saved": f"/uploads/{template_id}/mapping_pdf_labels.json",
        "final_html_path": result["final_html_path"],
        "final_html_url": result["final_html_url"],
        "template_html_url": result.get("template_html_url"),
        "token_map_size": result.get("token_map_size", 0),
    }


# ---------- Discover ----------
@app.post("/reports/discover")
def discover_reports(p: DiscoverPayload):
    db_path = _db_path_from_payload_or_default(p.connection_id)
    if not db_path.exists():
        raise HTTPException(status_code=400, detail=f"DB not found: {db_path}")

    # OpenAI client/env indirection (as in your repo)
    try:
        from .app.services.reports.ReportGenerate import (
            client as openai_client,
            MODEL as OPENAI_MODEL,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI client unavailable: {e}")

    # Load the SAME image_contents captured during mapping_approve() / run_after_approve()
    image_contents = _load_image_contents(p.template_id)

    try:
        OBJ = build_or_load_contract(
            uploads_root=UPLOAD_ROOT,
            template_id=p.template_id,
            db_path=db_path,
            openai_client=openai_client,
            model=OPENAI_MODEL,
            # New param in auto_fill.build_or_load_contract (optional, but we pass it to reuse the image)
            image_contents=image_contents,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Contract build/load failed: {e}")

    try:
        summary = discover_batches_and_counts(
            db_path=db_path,
            contract=OBJ,
            start_date=p.start_date,
            end_date=p.end_date,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Discovery failed: {e}")

    return {
        "template_id": p.template_id,
        "name": "Template",
        "batches": [
            {
                "id": b["id"],
                "rows": b["rows"],
                "parent": b["parent"],
                "selected": True,
            }
            for b in summary["batches"]
        ],
        "batches_count": summary["batches_count"],
        "rows_total": summary["rows_total"],
    }


# ---------- Run ----------
def _ensure_contract_files(template_id: str) -> tuple[Path, Path]:
    tdir = UPLOAD_ROOT / template_id
    if not tdir.exists():
        raise HTTPException(status_code=404, detail="template_id not found")

    template_html_path = tdir / "report_final.html"
    if not template_html_path.exists():
        template_html_path = tdir / "template_p1.html"
    if not template_html_path.exists():
        raise HTTPException(
            status_code=404,
            detail="No template HTML found (report_final.html or template_p1.html).",
        )

    contract_path = tdir / "contract.json"
    if not contract_path.exists():
        raise HTTPException(
            status_code=400,
            detail=(
                "Missing contract.json. Finish template approval/mapping to create a "
                "contract for generation."
            ),
        )

    return template_html_path, contract_path


@app.post("/reports/run")
def start_run(p: RunPayload):
    db_path = _db_path_from_payload_or_default(p.connection_id)
    if not db_path.exists():
        raise HTTPException(status_code=400, detail=f"DB not found: {db_path}")

    template_html_path, contract_path = _ensure_contract_files(p.template_id)
    tdir = template_html_path.parent

    try:
        OBJ = json.loads(contract_path.read_text(encoding="utf-8"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Invalid contract.json: {e}")

    ts = str(int(time.time()))
    out_html = tdir / f"filled_{ts}.html"
    out_pdf = tdir / f"filled_{ts}.pdf"

    try:
        from .app.services.reports.ReportGenerate import fill_and_print

        fill_and_print(
            OBJ=OBJ,
            TEMPLATE_PATH=template_html_path,
            DB_PATH=db_path,
            OUT_HTML=out_html,
            OUT_PDF=out_pdf,
            START_DATE=p.start_date,
            END_DATE=p.end_date,
            batch_ids=p.batch_ids,
        )
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail=(
                "Report generation module not found. "
                "Add .app.services.reports.ReportGenerate.fill_and_print("
                "OBJ, TEMPLATE_PATH, DB_PATH, OUT_HTML, OUT_PDF, START_DATE, END_DATE, batch_ids=None)."
            ),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {e}")

    return {
        "ok": True,
        "run_id": str(uuid.uuid4()),
        "template_id": p.template_id,
        "start_date": p.start_date,
        "end_date": p.end_date,
        "html_url": f"/uploads/{p.template_id}/{out_html.name}",
        "pdf_url": f"/uploads/{p.template_id}/{out_pdf.name}",
    }
