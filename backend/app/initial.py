import os, sys, re, json, base64, sqlite3, asyncio, tempfile
from pathlib import Path
from collections import defaultdict
from urllib.parse import urlparse
import argparse

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY environment variable is required to run this script.")
os.environ.setdefault("OPENAI_API_KEY", OPENAI_API_KEY)

PDF_PATH = Path(os.getenv("PDF_PATH", r"C:\Users\alfre\OneDrive\Desktop\CrystalReportViewer1 (6).pdf"))

OUT_DIR = Path.cwd() / "llm_pdf_mapping_outputs_v2"
OUT_DIR.mkdir(parents=True, exist_ok=True)

MODEL      = os.getenv("OPENAI_MODEL", "gpt-5") 
DPI        = int(os.getenv("PDF_DPI", "400"))
ITERATIONS = int(os.getenv("REFINE_ITERS", "1"))

OUT_PDF = OUT_DIR / "report_filled_new.pdf"
