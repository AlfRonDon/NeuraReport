# mypy: ignore-errors
"""
PDF Table Extraction using Multiple Tools.

Supports:
- Tabula (tabula-py): Best for well-structured tables
- Camelot: Best for complex table layouts with borders
- PyMuPDF (fitz): Fast, general purpose
- pdfplumber: Detailed layout analysis
- Marker: PDF to markdown conversion

Each extractor has different strengths - use compare_extractors() to find the best one.
"""
from __future__ import annotations

import json
import logging
import tempfile
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

logger = logging.getLogger("neura.extraction.pdf")


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


@dataclass
class ExtractionResult:
    """Result of PDF extraction."""
    tables: List[ExtractedTable]
    text: str
    page_count: int
    method: str
    errors: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


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
    ) -> ExtractionResult:
        """Extract tables from a PDF."""
        pass

    def extract_text(
        self,
        pdf_path: Union[str, Path],
        pages: Optional[List[int]] = None,
    ) -> str:
        """Extract text from a PDF."""
        # Default implementation - subclasses can override
        result = self.extract_tables(pdf_path, pages)
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

        pdf_path = Path(pdf_path)
        tables: List[ExtractedTable] = []
        errors: List[str] = []

        try:
            # Determine pages to extract
            page_spec = "all" if pages is None else [p + 1 for p in pages]  # tabula uses 1-based

            # Extract all tables
            dfs = tabula.read_pdf(
                str(pdf_path),
                pages=page_spec,
                multiple_tables=True,
                pandas_options={"header": None},
            )

            for i, df in enumerate(dfs):
                if df is None or df.empty:
                    continue

                # Convert DataFrame to table
                data = df.fillna("").astype(str).values.tolist()

                if len(data) < 1:
                    continue

                # First row as headers
                headers = [str(h).strip() for h in data[0]]
                rows = [[str(cell).strip() for cell in row] for row in data[1:]]

                # Skip if headers look like data (no text)
                if not any(h for h in headers):
                    if rows:
                        headers = [f"Column_{j+1}" for j in range(len(rows[0]))]
                    else:
                        continue

                tables.append(ExtractedTable(
                    id=f"tabula_table_{i+1}",
                    page=1,  # tabula doesn't always report page numbers
                    headers=headers,
                    rows=rows,
                    confidence=0.85,
                    method=self.name,
                ))

            # Get page count
            try:
                import fitz
                doc = fitz.open(pdf_path)
                page_count = doc.page_count
                doc.close()
            except Exception:
                page_count = len(dfs) if dfs else 0

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

        pdf_path = Path(pdf_path)
        tables: List[ExtractedTable] = []
        errors: List[str] = []

        try:
            # Determine pages to extract
            page_spec = "all" if pages is None else ",".join(str(p + 1) for p in pages)

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

            for i, ct in enumerate(camelot_tables):
                df = ct.df
                if df is None or df.empty:
                    continue

                # Convert DataFrame to table
                data = df.fillna("").astype(str).values.tolist()

                if len(data) < 1:
                    continue

                # First row as headers
                headers = [str(h).strip() for h in data[0]]
                rows = [[str(cell).strip() for cell in row] for row in data[1:]]

                # Get bounding box
                bbox = None
                if hasattr(ct, '_bbox'):
                    bbox = ct._bbox

                tables.append(ExtractedTable(
                    id=f"camelot_table_{i+1}",
                    page=ct.page if hasattr(ct, 'page') else 1,
                    headers=headers,
                    rows=rows,
                    confidence=ct.accuracy / 100.0 if hasattr(ct, 'accuracy') else 0.8,
                    method=self.name,
                    bbox=bbox,
                    metadata={"flavor": flavor},
                ))

            # Get page count
            try:
                import fitz
                doc = fitz.open(pdf_path)
                page_count = doc.page_count
                doc.close()
            except Exception:
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
        except Exception:
            pass
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
