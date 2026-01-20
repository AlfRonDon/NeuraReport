# mypy: ignore-errors
"""
Excel/Spreadsheet Extraction Module.

Supports:
- openpyxl (.xlsx, .xlsm)
- xlrd (.xls)
- pandas (general purpose)
- CSV/TSV files
"""
from __future__ import annotations

import csv
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

logger = logging.getLogger("neura.extraction.excel")


@dataclass
class ExcelSheet:
    """Data from a single Excel sheet."""
    name: str
    headers: List[str]
    rows: List[List[Any]]
    row_count: int
    column_count: int
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ExcelExtractionResult:
    """Result of Excel extraction."""
    sheets: List[ExcelSheet]
    filename: str
    format: str
    errors: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


class ExcelExtractor:
    """
    Excel/spreadsheet data extractor.

    Supports multiple formats and handles:
    - Multiple sheets
    - Header detection
    - Data type preservation
    - Large file handling
    """

    def __init__(
        self,
        max_rows: int = 10000,
        max_sheets: int = 20,
        detect_headers: bool = True,
    ):
        self.max_rows = max_rows
        self.max_sheets = max_sheets
        self.detect_headers = detect_headers

    def extract(
        self,
        file_path: Union[str, Path],
        sheet_names: Optional[List[str]] = None,
    ) -> ExcelExtractionResult:
        """
        Extract data from an Excel file.

        Args:
            file_path: Path to Excel file
            sheet_names: Optional list of sheet names to extract

        Returns:
            ExcelExtractionResult with all sheet data
        """
        file_path = Path(file_path)
        suffix = file_path.suffix.lower()

        if suffix == ".csv":
            return self._extract_csv(file_path)
        elif suffix == ".tsv":
            return self._extract_csv(file_path, delimiter="\t")
        elif suffix in (".xlsx", ".xlsm"):
            return self._extract_xlsx(file_path, sheet_names)
        elif suffix == ".xls":
            return self._extract_xls(file_path, sheet_names)
        else:
            return ExcelExtractionResult(
                sheets=[],
                filename=file_path.name,
                format="unknown",
                errors=[f"Unsupported format: {suffix}"],
            )

    def _extract_xlsx(
        self,
        file_path: Path,
        sheet_names: Optional[List[str]] = None,
    ) -> ExcelExtractionResult:
        """Extract from .xlsx/.xlsm files using openpyxl."""
        try:
            import openpyxl
        except ImportError:
            return ExcelExtractionResult(
                sheets=[],
                filename=file_path.name,
                format="xlsx",
                errors=["openpyxl not installed. Run: pip install openpyxl"],
            )

        sheets: List[ExcelSheet] = []
        errors: List[str] = []

        try:
            workbook = openpyxl.load_workbook(file_path, data_only=True, read_only=True)

            sheets_to_process = sheet_names or workbook.sheetnames[:self.max_sheets]

            if len(workbook.sheetnames) > self.max_sheets and not sheet_names:
                errors.append(f"File has {len(workbook.sheetnames)} sheets, processing first {self.max_sheets}")

            for sheet_name in sheets_to_process:
                if sheet_name not in workbook.sheetnames:
                    errors.append(f"Sheet '{sheet_name}' not found")
                    continue

                sheet = workbook[sheet_name]

                # Read data
                rows_data: List[List[Any]] = []
                for row_idx, row in enumerate(sheet.iter_rows(values_only=True)):
                    if row_idx >= self.max_rows:
                        errors.append(f"Sheet '{sheet_name}' truncated at {self.max_rows} rows")
                        break

                    # Convert row to list and clean values
                    cleaned_row = []
                    for cell in row:
                        if cell is None:
                            cleaned_row.append("")
                        elif isinstance(cell, (int, float)):
                            cleaned_row.append(cell)
                        else:
                            cleaned_row.append(str(cell))
                    rows_data.append(cleaned_row)

                if not rows_data:
                    continue

                # Detect headers
                if self.detect_headers and rows_data:
                    headers = [str(h) if h else f"Column_{i+1}" for i, h in enumerate(rows_data[0])]
                    data_rows = rows_data[1:]
                else:
                    headers = [f"Column_{i+1}" for i in range(len(rows_data[0]))]
                    data_rows = rows_data

                # Normalize row lengths
                max_cols = len(headers)
                normalized_rows = []
                for row in data_rows:
                    normalized = list(row)
                    while len(normalized) < max_cols:
                        normalized.append("")
                    normalized_rows.append(normalized[:max_cols])

                sheets.append(ExcelSheet(
                    name=sheet_name,
                    headers=headers,
                    rows=normalized_rows,
                    row_count=len(normalized_rows),
                    column_count=len(headers),
                ))

            workbook.close()

            return ExcelExtractionResult(
                sheets=sheets,
                filename=file_path.name,
                format="xlsx",
                errors=errors,
                metadata={"total_sheets": len(workbook.sheetnames)},
            )

        except Exception as e:
            logger.error(f"XLSX extraction failed: {e}")
            return ExcelExtractionResult(
                sheets=[],
                filename=file_path.name,
                format="xlsx",
                errors=[f"Extraction failed: {str(e)}"],
            )

    def _extract_xls(
        self,
        file_path: Path,
        sheet_names: Optional[List[str]] = None,
    ) -> ExcelExtractionResult:
        """Extract from .xls files using xlrd."""
        try:
            import xlrd
        except ImportError:
            return ExcelExtractionResult(
                sheets=[],
                filename=file_path.name,
                format="xls",
                errors=["xlrd not installed. Run: pip install xlrd"],
            )

        sheets: List[ExcelSheet] = []
        errors: List[str] = []

        try:
            workbook = xlrd.open_workbook(file_path)

            sheet_list = sheet_names or workbook.sheet_names()[:self.max_sheets]

            for sheet_name in sheet_list:
                try:
                    sheet = workbook.sheet_by_name(sheet_name)
                except xlrd.XLRDError:
                    errors.append(f"Sheet '{sheet_name}' not found")
                    continue

                rows_data: List[List[Any]] = []
                for row_idx in range(min(sheet.nrows, self.max_rows)):
                    row = []
                    for col_idx in range(sheet.ncols):
                        cell = sheet.cell(row_idx, col_idx)
                        if cell.ctype == xlrd.XL_CELL_EMPTY:
                            row.append("")
                        elif cell.ctype == xlrd.XL_CELL_NUMBER:
                            row.append(cell.value)
                        else:
                            row.append(str(cell.value))
                    rows_data.append(row)

                if not rows_data:
                    continue

                # Detect headers
                if self.detect_headers and rows_data:
                    headers = [str(h) if h else f"Column_{i+1}" for i, h in enumerate(rows_data[0])]
                    data_rows = rows_data[1:]
                else:
                    headers = [f"Column_{i+1}" for i in range(len(rows_data[0]))]
                    data_rows = rows_data

                sheets.append(ExcelSheet(
                    name=sheet_name,
                    headers=headers,
                    rows=data_rows,
                    row_count=len(data_rows),
                    column_count=len(headers),
                ))

            return ExcelExtractionResult(
                sheets=sheets,
                filename=file_path.name,
                format="xls",
                errors=errors,
            )

        except Exception as e:
            logger.error(f"XLS extraction failed: {e}")
            return ExcelExtractionResult(
                sheets=[],
                filename=file_path.name,
                format="xls",
                errors=[f"Extraction failed: {str(e)}"],
            )

    def _extract_csv(
        self,
        file_path: Path,
        delimiter: str = ",",
    ) -> ExcelExtractionResult:
        """Extract from CSV/TSV files."""
        errors: List[str] = []

        try:
            with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                # Detect delimiter
                sample = f.read(8192)
                f.seek(0)

                try:
                    dialect = csv.Sniffer().sniff(sample, delimiters=',\t;|')
                    delimiter = dialect.delimiter
                except csv.Error:
                    pass

                reader = csv.reader(f, delimiter=delimiter)
                rows_data = list(reader)

            if not rows_data:
                return ExcelExtractionResult(
                    sheets=[],
                    filename=file_path.name,
                    format="csv",
                    errors=["CSV file is empty"],
                )

            # Truncate if needed
            if len(rows_data) > self.max_rows:
                errors.append(f"CSV truncated at {self.max_rows} rows")
                rows_data = rows_data[:self.max_rows]

            # Detect headers
            if self.detect_headers:
                headers = [str(h) if h else f"Column_{i+1}" for i, h in enumerate(rows_data[0])]
                data_rows = rows_data[1:]
            else:
                max_cols = max(len(row) for row in rows_data)
                headers = [f"Column_{i+1}" for i in range(max_cols)]
                data_rows = rows_data

            # Normalize row lengths
            normalized_rows = []
            for row in data_rows:
                normalized = list(row)
                while len(normalized) < len(headers):
                    normalized.append("")
                normalized_rows.append(normalized[:len(headers)])

            sheets = [ExcelSheet(
                name=file_path.stem,
                headers=headers,
                rows=normalized_rows,
                row_count=len(normalized_rows),
                column_count=len(headers),
            )]

            return ExcelExtractionResult(
                sheets=sheets,
                filename=file_path.name,
                format="csv",
                errors=errors,
            )

        except Exception as e:
            logger.error(f"CSV extraction failed: {e}")
            return ExcelExtractionResult(
                sheets=[],
                filename=file_path.name,
                format="csv",
                errors=[f"Extraction failed: {str(e)}"],
            )


def extract_excel_data(
    file_path: Union[str, Path],
    sheet_names: Optional[List[str]] = None,
    max_rows: int = 10000,
) -> ExcelExtractionResult:
    """
    Quick function to extract data from Excel/CSV files.

    Args:
        file_path: Path to file
        sheet_names: Optional list of sheets to extract
        max_rows: Maximum rows per sheet

    Returns:
        ExcelExtractionResult
    """
    extractor = ExcelExtractor(max_rows=max_rows)
    return extractor.extract(file_path, sheet_names)
