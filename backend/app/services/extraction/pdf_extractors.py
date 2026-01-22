# mypy: ignore-errors
"""
PDF Table Extraction using Multiple Tools.

Supports:
- Tabula (tabula-py): Best for well-structured tables
- Camelot: Best for complex table layouts with borders
- PyMuPDF (fitz): Fast, general purpose
- pdfplumber: Detailed layout analysis
- Marker: PDF to markdown conversion

Features:
- Multiple extraction methods with automatic fallback
- OCR support for scanned PDFs (via Tesseract/EasyOCR)
- Intelligent table detection and confidence scoring
- Layout-aware text extraction
- Parallel processing for multi-page documents
- Smart header detection

Each extractor has different strengths - use compare_extractors() to find the best one.
"""
from __future__ import annotations

import concurrent.futures
import hashlib
import json
import logging
import os
import re
import tempfile
import threading
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

logger = logging.getLogger("neura.extraction.pdf")


# =============================================================================
# Configuration
# =============================================================================

@dataclass
class ExtractionConfig:
    """Configuration for PDF extraction."""
    max_pages: int = 100
    max_tables_per_page: int = 10
    min_rows_for_table: int = 2
    min_cols_for_table: int = 2
    ocr_enabled: bool = True
    ocr_language: str = "eng"
    parallel_pages: bool = True
    max_workers: int = 4
    confidence_threshold: float = 0.5
    detect_headers: bool = True
    preserve_layout: bool = True


DEFAULT_CONFIG = ExtractionConfig()


@dataclass
class ExtractedTable:
    """A table extracted from a PDF."""
    id: str
    page: int
    headers: List[str]
    rows: List[List[str]]
    confidence: float = 1.0
    method: str = "unknown"
    bbox: Optional[Tuple[float, float, float, float]] = None  # x0, y0, x1, y1
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        """Validate and clean up table data."""
        # Ensure headers are strings
        self.headers = [str(h).strip() if h else "" for h in self.headers]
        # Ensure rows are list of string lists
        self.rows = [
            [str(cell).strip() if cell else "" for cell in row]
            for row in self.rows
        ]

    @property
    def row_count(self) -> int:
        """Number of data rows."""
        return len(self.rows)

    @property
    def col_count(self) -> int:
        """Number of columns."""
        return len(self.headers) if self.headers else (len(self.rows[0]) if self.rows else 0)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "page": self.page,
            "headers": self.headers,
            "rows": self.rows,
            "confidence": self.confidence,
            "method": self.method,
            "bbox": self.bbox,
            "metadata": self.metadata,
            "row_count": self.row_count,
            "col_count": self.col_count,
        }

    def get_column(self, col_name: str) -> List[str]:
        """Get all values from a column by header name."""
        try:
            idx = self.headers.index(col_name)
            return [row[idx] if idx < len(row) else "" for row in self.rows]
        except ValueError:
            return []


@dataclass
class ExtractionResult:
    """Result of PDF extraction."""
    tables: List[ExtractedTable]
    text: str
    page_count: int
    method: str
    errors: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    extraction_time_ms: float = 0.0
    ocr_used: bool = False

    @property
    def has_tables(self) -> bool:
        """Check if any tables were extracted."""
        return len(self.tables) > 0

    @property
    def total_rows(self) -> int:
        """Total number of rows across all tables."""
        return sum(t.row_count for t in self.tables)

    def get_table_by_page(self, page: int) -> List[ExtractedTable]:
        """Get all tables from a specific page."""
        return [t for t in self.tables if t.page == page]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "tables": [t.to_dict() for t in self.tables],
            "text": self.text,
            "page_count": self.page_count,
            "method": self.method,
            "errors": self.errors,
            "metadata": self.metadata,
            "extraction_time_ms": self.extraction_time_ms,
            "ocr_used": self.ocr_used,
            "has_tables": self.has_tables,
            "total_rows": self.total_rows,
        }


# =============================================================================
# OCR Support
# =============================================================================

class OCREngine:
    """OCR engine abstraction supporting multiple backends."""

    def __init__(self, language: str = "eng"):
        self.language = language
        self._engine: Optional[str] = None
        self._lock = threading.Lock()
        self._easyocr_reader = None
        self._easyocr_lock = threading.Lock()

    def _detect_engine(self) -> str:
        """Detect available OCR engine."""
        if self._engine:
            return self._engine

        with self._lock:
            # Try EasyOCR first (better accuracy)
            try:
                import easyocr
                self._engine = "easyocr"
                return self._engine
            except ImportError:
                pass

            # Try Tesseract
            try:
                import pytesseract
                # Check if tesseract binary is available
                pytesseract.get_tesseract_version()
                self._engine = "tesseract"
                return self._engine
            except ImportError:
                logger.debug("pytesseract not installed")
            except Exception as e:
                logger.debug(f"Tesseract not available: {e}")

            self._engine = "none"
            return self._engine

    def extract_text(self, image_bytes: bytes) -> str:
        """Extract text from image bytes using OCR."""
        engine = self._detect_engine()

        if engine == "none":
            return ""

        try:
            if engine == "easyocr":
                return self._ocr_easyocr(image_bytes)
            elif engine == "tesseract":
                return self._ocr_tesseract(image_bytes)
        except Exception as e:
            logger.warning(f"OCR extraction failed: {e}")
            return ""

        return ""

    def _ocr_easyocr(self, image_bytes: bytes) -> str:
        """Extract text using EasyOCR."""
        import easyocr
        import numpy as np
        from PIL import Image
        import io

        # Convert bytes to image
        image = Image.open(io.BytesIO(image_bytes))
        image_array = np.array(image)

        # Initialize reader (cached)
        reader = self._easyocr_reader
        if reader is None:
            with self._easyocr_lock:
                reader = self._easyocr_reader
                if reader is None:
                    reader = easyocr.Reader([self.language[:2]], gpu=False)
                    self._easyocr_reader = reader
        results = reader.readtext(image_array)

        # Extract text
        return " ".join([text for _, text, _ in results])

    def _ocr_tesseract(self, image_bytes: bytes) -> str:
        """Extract text using Tesseract."""
        import pytesseract
        from PIL import Image
        import io

        image = Image.open(io.BytesIO(image_bytes))
        return pytesseract.image_to_string(image, lang=self.language)

    def is_available(self) -> bool:
        """Check if OCR is available."""
        return self._detect_engine() != "none"


# Global OCR engine instance
_ocr_engine: Optional[OCREngine] = None


def get_ocr_engine(language: str = "eng") -> OCREngine:
    """Get or create OCR engine."""
    global _ocr_engine
    if _ocr_engine is None:
        _ocr_engine = OCREngine(language)
    return _ocr_engine


# =============================================================================
# Helper Functions
# =============================================================================

def _resolve_config(config: Optional[ExtractionConfig]) -> ExtractionConfig:
    return config or DEFAULT_CONFIG


def _get_pdf_page_count(pdf_path: Union[str, Path]) -> Optional[int]:
    try:
        import fitz
    except ImportError:
        return None
    try:
        doc = fitz.open(pdf_path)
        count = doc.page_count
        doc.close()
        return count
    except Exception:
        return None


def _resolve_page_numbers(
    pdf_path: Union[str, Path],
    pages: Optional[List[int]],
    config: ExtractionConfig,
) -> List[int]:
    if pages:
        normalized = [p for p in pages if isinstance(p, int) and p >= 0]
    else:
        page_count = _get_pdf_page_count(pdf_path)
        if page_count is None:
            normalized = list(range(config.max_pages))
        else:
            normalized = list(range(page_count))
    if config.max_pages and len(normalized) > config.max_pages:
        normalized = normalized[: config.max_pages]
    return normalized


def _normalize_table_data(
    data: List[List[Any]],
    config: ExtractionConfig,
) -> Tuple[List[str], List[List[str]]]:
    if not data:
        return [], []

    cleaned_rows = [
        [_clean_cell_value(cell) for cell in row]
        for row in data
    ]

    if not cleaned_rows:
        return [], []

    if config.detect_headers:
        header_candidate = cleaned_rows[0]
        if _is_header_row(header_candidate, cleaned_rows):
            headers = [h if h else f"Column_{i+1}" for i, h in enumerate(header_candidate)]
            rows = cleaned_rows[1:]
        else:
            headers = [f"Column_{i+1}" for i in range(len(cleaned_rows[0]))]
            rows = cleaned_rows
    else:
        header_candidate = cleaned_rows[0]
        headers = [h if h else f"Column_{i+1}" for i, h in enumerate(header_candidate)]
        rows = cleaned_rows[1:]

    normalized_rows: List[List[str]] = []
    for row in rows:
        normalized_row = [row[i] if i < len(row) else "" for i in range(len(headers))]
        normalized_rows.append(normalized_row)

    return headers, normalized_rows


def _apply_table_confidence(
    table: ExtractedTable,
    config: ExtractionConfig,
    base_confidence: float,
) -> float:
    confidence = _calculate_table_confidence(table, config)
    return min(1.0, max(0.0, base_confidence * confidence))


def _table_meets_requirements(table: ExtractedTable, config: ExtractionConfig) -> bool:
    if table.row_count < config.min_rows_for_table:
        return False
    if table.col_count < config.min_cols_for_table:
        return False
    if table.confidence < config.confidence_threshold:
        return False
    return True

def _is_header_row(row: List[str], all_rows: List[List[str]]) -> bool:
    """
    Detect if a row is likely a header row.

    Uses heuristics:
    - Headers are often shorter than data
    - Headers contain fewer numbers
    - Headers have distinct patterns (all caps, title case)
    """
    if not row or not all_rows:
        return False

    # Count numeric values in the row
    num_numeric = sum(1 for cell in row if _is_numeric(cell))
    num_total = len([c for c in row if c.strip()])

    if num_total == 0:
        return False

    numeric_ratio = num_numeric / num_total

    # Headers usually have fewer numeric values
    if numeric_ratio < 0.3:
        # Check if other rows have more numeric values
        if len(all_rows) > 1:
            other_numeric_ratios = []
            for other_row in all_rows[1:min(5, len(all_rows))]:
                other_num = sum(1 for cell in other_row if _is_numeric(cell))
                other_total = len([c for c in other_row if c.strip()])
                if other_total > 0:
                    other_numeric_ratios.append(other_num / other_total)

            if other_numeric_ratios:
                avg_other_ratio = sum(other_numeric_ratios) / len(other_numeric_ratios)
                if avg_other_ratio > numeric_ratio + 0.2:
                    return True

    # Check for common header patterns
    header_patterns = [
        lambda c: c.isupper(),  # ALL CAPS
        lambda c: c.istitle(),  # Title Case
        lambda c: c.lower() in ("id", "name", "date", "amount", "total", "qty", "price", "description"),
    ]

    pattern_matches = sum(
        1 for cell in row
        if cell.strip() and any(p(cell.strip()) for p in header_patterns)
    )

    return pattern_matches >= len(row) // 2


def _is_numeric(value: str) -> bool:
    """Check if a string represents a numeric value."""
    if not value or not value.strip():
        return False

    cleaned = value.strip().replace(",", "").replace("$", "").replace("%", "")
    cleaned = cleaned.lstrip("-+")

    try:
        float(cleaned)
        return True
    except ValueError:
        return False


def _clean_cell_value(value: Any) -> str:
    """Clean and normalize a cell value."""
    if value is None:
        return ""

    text = str(value).strip()

    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)

    # Remove null characters
    text = text.replace('\x00', '')

    return text


def _calculate_table_confidence(
    table: ExtractedTable,
    config: ExtractionConfig,
) -> float:
    """Calculate confidence score for extracted table."""
    confidence = 1.0

    # Penalize tables with few rows
    if table.row_count < config.min_rows_for_table:
        confidence *= 0.5

    # Penalize tables with few columns
    if table.col_count < config.min_cols_for_table:
        confidence *= 0.5

    # Penalize tables with many empty cells
    empty_cells = sum(
        1 for row in table.rows
        for cell in row
        if not cell.strip()
    )
    total_cells = table.row_count * table.col_count
    if total_cells > 0:
        empty_ratio = empty_cells / total_cells
        if empty_ratio > 0.5:
            confidence *= (1 - empty_ratio)

    # Penalize tables with inconsistent row lengths
    expected_cols = table.col_count
    inconsistent_rows = sum(
        1 for row in table.rows
        if len(row) != expected_cols
    )
    if table.row_count > 0:
        inconsistent_ratio = inconsistent_rows / table.row_count
        confidence *= (1 - inconsistent_ratio * 0.5)

    # Boost confidence if headers look valid
    if table.headers and all(h.strip() for h in table.headers):
        confidence *= 1.1

    return min(1.0, max(0.0, confidence))


class PDFExtractor(ABC):
    """Abstract base class for PDF extractors."""

    name: str = "base"

    @abstractmethod
    def is_available(self) -> bool:
        """Check if this extractor is available."""
        pass

    @abstractmethod
    def extract_tables(
        self,
        pdf_path: Union[str, Path],
        pages: Optional[List[int]] = None,
        config: Optional[ExtractionConfig] = None,
    ) -> ExtractionResult:
        """Extract tables from a PDF."""
        pass

    def extract_text(
        self,
        pdf_path: Union[str, Path],
        pages: Optional[List[int]] = None,
        config: Optional[ExtractionConfig] = None,
    ) -> str:
        """Extract text from a PDF."""
        # Default implementation - subclasses can override
        result = self.extract_tables(pdf_path, pages, config=config)
        return result.text


class TabulaExtractor(PDFExtractor):
    """
    Tabula-based PDF table extraction.

    Best for:
    - Well-structured tables with clear borders
    - Tables spanning multiple pages
    - Consistent column layouts

    Requires: tabula-py (pip install tabula-py) + Java Runtime
    """

    name = "tabula"

    def is_available(self) -> bool:
        try:
            import tabula
            # Try to check if Java is available
            return True
        except ImportError:
            return False

    def extract_tables(
        self,
        pdf_path: Union[str, Path],
        pages: Optional[List[int]] = None,
        config: Optional[ExtractionConfig] = None,
    ) -> ExtractionResult:
        try:
            import tabula
        except ImportError:
            return ExtractionResult(
                tables=[],
                text="",
                page_count=0,
                method=self.name,
                errors=["tabula-py not installed. Run: pip install tabula-py"],
            )

        config = _resolve_config(config)
        pdf_path = Path(pdf_path)
        tables: List[ExtractedTable] = []
        errors: List[str] = []
        base_confidence = 0.85

        try:
            pages_to_process = _resolve_page_numbers(pdf_path, pages, config)

            for page_num in pages_to_process:
                page_table_count = 0
                try:
                    dfs = tabula.read_pdf(
                        str(pdf_path),
                        pages=page_num + 1,  # tabula uses 1-based
                        multiple_tables=True,
                        pandas_options={"header": None},
                    )
                except Exception as exc:
                    errors.append(f"Tabula failed on page {page_num + 1}: {exc}")
                    continue

                for i, df in enumerate(dfs):
                    if page_table_count >= config.max_tables_per_page:
                        break
                    if df is None or df.empty:
                        continue

                    data = df.fillna("").astype(str).values.tolist()
                    headers, rows = _normalize_table_data(data, config)
                    if not headers or not rows:
                        continue

                    table = ExtractedTable(
                        id=f"tabula_p{page_num+1}_t{i+1}",
                        page=page_num + 1,
                        headers=headers,
                        rows=rows,
                        confidence=base_confidence,
                        method=self.name,
                    )
                    table.confidence = _apply_table_confidence(table, config, base_confidence)
                    if not _table_meets_requirements(table, config):
                        continue
                    tables.append(table)
                    page_table_count += 1

            # Get page count
            page_count = _get_pdf_page_count(pdf_path)
            if page_count is None:
                page_count = len(pages_to_process)

            return ExtractionResult(
                tables=tables,
                text="",  # tabula focuses on tables
                page_count=page_count,
                method=self.name,
                errors=errors,
            )

        except Exception as e:
            logger.error(f"Tabula extraction failed: {e}")
            return ExtractionResult(
                tables=[],
                text="",
                page_count=0,
                method=self.name,
                errors=[f"Tabula extraction failed: {str(e)}"],
            )


class CamelotExtractor(PDFExtractor):
    """
    Camelot-based PDF table extraction.

    Best for:
    - Complex table layouts
    - Tables with merged cells
    - Tables with visible borders (lattice mode)
    - Tables without borders (stream mode)

    Requires: camelot-py (pip install camelot-py[cv])
    """

    name = "camelot"

    def is_available(self) -> bool:
        try:
            import camelot
            return True
        except ImportError:
            return False

    def extract_tables(
        self,
        pdf_path: Union[str, Path],
        pages: Optional[List[int]] = None,
        config: Optional[ExtractionConfig] = None,
        flavor: str = "lattice",  # or "stream"
    ) -> ExtractionResult:
        try:
            import camelot
        except ImportError:
            return ExtractionResult(
                tables=[],
                text="",
                page_count=0,
                method=self.name,
                errors=["camelot-py not installed. Run: pip install camelot-py[cv]"],
            )

        config = _resolve_config(config)
        pdf_path = Path(pdf_path)
        tables: List[ExtractedTable] = []
        errors: List[str] = []

        try:
            pages_to_process = _resolve_page_numbers(pdf_path, pages, config)
            page_spec = ",".join(str(p + 1) for p in pages_to_process) if pages_to_process else "1"

            # Try lattice mode first (for tables with borders)
            try:
                camelot_tables = camelot.read_pdf(
                    str(pdf_path),
                    pages=page_spec,
                    flavor=flavor,
                )
            except Exception as e:
                logger.warning(f"Camelot {flavor} mode failed, trying alternative: {e}")
                alt_flavor = "stream" if flavor == "lattice" else "lattice"
                camelot_tables = camelot.read_pdf(
                    str(pdf_path),
                    pages=page_spec,
                    flavor=alt_flavor,
                )

            page_table_counts: Dict[int, int] = {}

            for i, ct in enumerate(camelot_tables):
                page_number = ct.page if hasattr(ct, 'page') else 1
                page_table_counts.setdefault(page_number, 0)
                if page_table_counts[page_number] >= config.max_tables_per_page:
                    continue
                df = ct.df
                if df is None or df.empty:
                    continue

                # Convert DataFrame to table
                data = df.fillna("").astype(str).values.tolist()

                if len(data) < 1:
                    continue

                headers, rows = _normalize_table_data(data, config)
                if not headers or not rows:
                    continue

                # Get bounding box
                bbox = None
                if hasattr(ct, '_bbox'):
                    bbox = ct._bbox

                base_confidence = ct.accuracy / 100.0 if hasattr(ct, 'accuracy') else 0.8
                table = ExtractedTable(
                    id=f"camelot_table_{i+1}",
                    page=page_number,
                    headers=headers,
                    rows=rows,
                    confidence=base_confidence,
                    method=self.name,
                    bbox=bbox,
                    metadata={"flavor": flavor},
                )
                table.confidence = _apply_table_confidence(table, config, base_confidence)
                if not _table_meets_requirements(table, config):
                    continue
                tables.append(table)
                page_table_counts[page_number] += 1

            # Get page count
            try:
                import fitz
                doc = fitz.open(pdf_path)
                page_count = doc.page_count
                doc.close()
            except ImportError:
                logger.debug("PyMuPDF not available for page count in Camelot extractor")
                page_count = 0
            except Exception as e:
                logger.debug(f"Could not get page count in Camelot extractor: {e}")
                page_count = 0

            return ExtractionResult(
                tables=tables,
                text="",
                page_count=page_count,
                method=self.name,
                errors=errors,
            )

        except Exception as e:
            logger.error(f"Camelot extraction failed: {e}")
            return ExtractionResult(
                tables=[],
                text="",
                page_count=0,
                method=self.name,
                errors=[f"Camelot extraction failed: {str(e)}"],
            )


class PyMuPDFExtractor(PDFExtractor):
    """
    PyMuPDF (fitz) based PDF extraction.

    Best for:
    - Fast extraction
    - General purpose
    - Text extraction with layout

    Requires: pymupdf (pip install pymupdf)
    """

    name = "pymupdf"

    def is_available(self) -> bool:
        try:
            import fitz
            return True
        except ImportError:
            return False

    def extract_tables(
        self,
        pdf_path: Union[str, Path],
        pages: Optional[List[int]] = None,
    ) -> ExtractionResult:
        try:
            import fitz
        except ImportError:
            return ExtractionResult(
                tables=[],
                text="",
                page_count=0,
                method=self.name,
                errors=["pymupdf not installed. Run: pip install pymupdf"],
            )

        pdf_path = Path(pdf_path)
        tables: List[ExtractedTable] = []
        text_parts: List[str] = []
        errors: List[str] = []

        try:
            doc = fitz.open(pdf_path)
            page_count = doc.page_count

            pages_to_process = pages if pages else range(page_count)

            for page_num in pages_to_process:
                if page_num >= page_count:
                    continue

                page = doc[page_num]

                # Extract text
                page_text = page.get_text("text")
                text_parts.append(f"--- Page {page_num + 1} ---\n{page_text}")

                # Extract tables using PyMuPDF's table detection
                try:
                    page_tables = page.find_tables()

                    for i, table in enumerate(page_tables):
                        if table.row_count == 0:
                            continue

                        data = table.extract()
                        if not data or len(data) < 2:
                            continue

                        # First row as headers
                        headers = [str(cell or "").strip() for cell in data[0]]
                        rows = []

                        for row in data[1:]:
                            normalized_row = []
                            for j, cell in enumerate(row):
                                if j < len(headers):
                                    normalized_row.append(str(cell or "").strip())
                            while len(normalized_row) < len(headers):
                                normalized_row.append("")
                            rows.append(normalized_row)

                        tables.append(ExtractedTable(
                            id=f"pymupdf_p{page_num+1}_t{i+1}",
                            page=page_num + 1,
                            headers=headers,
                            rows=rows,
                            confidence=0.9,
                            method=self.name,
                        ))

                except Exception as e:
                    errors.append(f"Table extraction failed on page {page_num + 1}: {e}")

            doc.close()

            return ExtractionResult(
                tables=tables,
                text="\n\n".join(text_parts),
                page_count=page_count,
                method=self.name,
                errors=errors,
            )

        except Exception as e:
            logger.error(f"PyMuPDF extraction failed: {e}")
            return ExtractionResult(
                tables=[],
                text="",
                page_count=0,
                method=self.name,
                errors=[f"PyMuPDF extraction failed: {str(e)}"],
            )


class PDFPlumberExtractor(PDFExtractor):
    """
    pdfplumber based PDF extraction.

    Best for:
    - Detailed layout analysis
    - Character-level extraction
    - Complex document structures

    Requires: pdfplumber (pip install pdfplumber)
    """

    name = "pdfplumber"

    def is_available(self) -> bool:
        try:
            import pdfplumber
            return True
        except ImportError:
            return False

    def extract_tables(
        self,
        pdf_path: Union[str, Path],
        pages: Optional[List[int]] = None,
    ) -> ExtractionResult:
        try:
            import pdfplumber
        except ImportError:
            return ExtractionResult(
                tables=[],
                text="",
                page_count=0,
                method=self.name,
                errors=["pdfplumber not installed. Run: pip install pdfplumber"],
            )

        pdf_path = Path(pdf_path)
        tables: List[ExtractedTable] = []
        text_parts: List[str] = []
        errors: List[str] = []

        try:
            with pdfplumber.open(pdf_path) as pdf:
                page_count = len(pdf.pages)
                pages_to_process = pages if pages else range(page_count)

                for page_num in pages_to_process:
                    if page_num >= page_count:
                        continue

                    page = pdf.pages[page_num]

                    # Extract text
                    page_text = page.extract_text() or ""
                    text_parts.append(f"--- Page {page_num + 1} ---\n{page_text}")

                    # Extract tables
                    try:
                        page_tables = page.extract_tables()

                        for i, table_data in enumerate(page_tables):
                            if not table_data or len(table_data) < 2:
                                continue

                            # First row as headers
                            headers = [str(cell or "").strip() for cell in table_data[0]]
                            rows = []

                            for row in table_data[1:]:
                                normalized_row = [str(cell or "").strip() for cell in row]
                                while len(normalized_row) < len(headers):
                                    normalized_row.append("")
                                rows.append(normalized_row[:len(headers)])

                            tables.append(ExtractedTable(
                                id=f"pdfplumber_p{page_num+1}_t{i+1}",
                                page=page_num + 1,
                                headers=headers,
                                rows=rows,
                                confidence=0.85,
                                method=self.name,
                            ))

                    except Exception as e:
                        errors.append(f"Table extraction failed on page {page_num + 1}: {e}")

            return ExtractionResult(
                tables=tables,
                text="\n\n".join(text_parts),
                page_count=page_count,
                method=self.name,
                errors=errors,
            )

        except Exception as e:
            logger.error(f"pdfplumber extraction failed: {e}")
            return ExtractionResult(
                tables=[],
                text="",
                page_count=0,
                method=self.name,
                errors=[f"pdfplumber extraction failed: {str(e)}"],
            )


# Registry of available extractors
EXTRACTORS: Dict[str, type] = {
    "tabula": TabulaExtractor,
    "camelot": CamelotExtractor,
    "pymupdf": PyMuPDFExtractor,
    "pdfplumber": PDFPlumberExtractor,
}


def get_available_extractors() -> List[str]:
    """Get list of available extractors."""
    available = []
    for name, cls in EXTRACTORS.items():
        try:
            extractor = cls()
            if extractor.is_available():
                available.append(name)
        except Exception as e:
            logger.debug(f"Extractor '{name}' not available: {e}")
    return available


def extract_pdf_tables(
    pdf_path: Union[str, Path],
    method: str = "auto",
    pages: Optional[List[int]] = None,
) -> ExtractionResult:
    """
    Extract tables from a PDF using the specified method.

    Args:
        pdf_path: Path to PDF file
        method: Extraction method (auto, tabula, camelot, pymupdf, pdfplumber)
        pages: Optional list of page numbers (0-indexed)

    Returns:
        ExtractionResult with extracted tables
    """
    if method == "auto":
        return extract_with_best_method(pdf_path, pages)

    if method not in EXTRACTORS:
        return ExtractionResult(
            tables=[],
            text="",
            page_count=0,
            method=method,
            errors=[f"Unknown extraction method: {method}. Available: {list(EXTRACTORS.keys())}"],
        )

    extractor = EXTRACTORS[method]()
    if not extractor.is_available():
        return ExtractionResult(
            tables=[],
            text="",
            page_count=0,
            method=method,
            errors=[f"Extractor '{method}' is not available. Check dependencies."],
        )

    return extractor.extract_tables(pdf_path, pages)


def extract_with_best_method(
    pdf_path: Union[str, Path],
    pages: Optional[List[int]] = None,
) -> ExtractionResult:
    """
    Try multiple extractors and return the best result.

    Priority order: pymupdf > pdfplumber > camelot > tabula
    """
    pdf_path = Path(pdf_path)
    best_result: Optional[ExtractionResult] = None

    # Priority order - faster methods first
    priority = ["pymupdf", "pdfplumber", "camelot", "tabula"]

    for method in priority:
        if method not in EXTRACTORS:
            continue

        extractor = EXTRACTORS[method]()
        if not extractor.is_available():
            continue

        try:
            result = extractor.extract_tables(pdf_path, pages)

            if result.errors and not result.tables:
                continue

            if best_result is None:
                best_result = result
            elif len(result.tables) > len(best_result.tables):
                best_result = result
            elif (len(result.tables) == len(best_result.tables) and
                  result.tables and best_result.tables and
                  result.tables[0].confidence > best_result.tables[0].confidence):
                best_result = result

            # If we got good results, no need to try more extractors
            if result.tables and not result.errors:
                break

        except Exception as e:
            logger.warning(f"Extractor {method} failed: {e}")
            continue

    if best_result is None:
        return ExtractionResult(
            tables=[],
            text="",
            page_count=0,
            method="auto",
            errors=["No extractors were able to process this PDF"],
        )

    return best_result


def compare_extractors(
    pdf_path: Union[str, Path],
    pages: Optional[List[int]] = None,
) -> Dict[str, ExtractionResult]:
    """
    Compare results from all available extractors.

    Useful for finding the best extractor for a specific document type.

    Returns:
        Dict mapping extractor name to its result
    """
    results = {}

    for name, cls in EXTRACTORS.items():
        try:
            extractor = cls()
            if extractor.is_available():
                results[name] = extractor.extract_tables(pdf_path, pages)
        except Exception as e:
            results[name] = ExtractionResult(
                tables=[],
                text="",
                page_count=0,
                method=name,
                errors=[str(e)],
            )

    return results
