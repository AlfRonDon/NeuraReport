"""
Spreadsheet API Routes - Spreadsheet editing and analysis endpoints.
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
import io

from ...schemas.spreadsheets import (
    CreateSpreadsheetRequest,
    UpdateSpreadsheetRequest,
    SpreadsheetResponse,
    SpreadsheetListResponse,
    CellUpdateRequest,
    SheetResponse,
    AddSheetRequest,
    ConditionalFormatRequest,
    DataValidationRequest,
    FreezePanesRequest,
    ExportRequest,
    PivotTableRequest,
    PivotTableResponse,
    AIFormulaRequest,
    AIFormulaResponse,
)
from ...services.spreadsheets import (
    SpreadsheetService,
    FormulaEngine,
    PivotService,
)

logger = logging.getLogger("neura.api.spreadsheets")

router = APIRouter(prefix="/spreadsheets", tags=["spreadsheets"])

# Service instances
_spreadsheet_service: Optional[SpreadsheetService] = None
_formula_engine: Optional[FormulaEngine] = None
_pivot_service: Optional[PivotService] = None


def get_spreadsheet_service() -> SpreadsheetService:
    global _spreadsheet_service
    if _spreadsheet_service is None:
        _spreadsheet_service = SpreadsheetService()
    return _spreadsheet_service


def get_formula_engine() -> FormulaEngine:
    global _formula_engine
    if _formula_engine is None:
        _formula_engine = FormulaEngine()
    return _formula_engine


def get_pivot_service() -> PivotService:
    global _pivot_service
    if _pivot_service is None:
        _pivot_service = PivotService()
    return _pivot_service


# ============================================
# Spreadsheet CRUD Endpoints
# ============================================

@router.post("", response_model=SpreadsheetResponse)
async def create_spreadsheet(
    request: CreateSpreadsheetRequest,
    svc: SpreadsheetService = Depends(get_spreadsheet_service),
):
    """Create a new spreadsheet."""
    spreadsheet = svc.create(
        name=request.name,
        initial_data=request.initial_data,
    )
    return _to_spreadsheet_response(spreadsheet)


@router.get("", response_model=SpreadsheetListResponse)
async def list_spreadsheets(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    svc: SpreadsheetService = Depends(get_spreadsheet_service),
):
    """List all spreadsheets."""
    spreadsheets = svc.list_spreadsheets(limit=limit, offset=offset)
    return SpreadsheetListResponse(
        spreadsheets=[_to_spreadsheet_response(s) for s in spreadsheets],
        total=len(spreadsheets),
        offset=offset,
        limit=limit,
    )


@router.get("/{spreadsheet_id}")
async def get_spreadsheet(
    spreadsheet_id: str,
    sheet_index: int = Query(0, ge=0),
    svc: SpreadsheetService = Depends(get_spreadsheet_service),
):
    """Get a spreadsheet with data."""
    spreadsheet = svc.get(spreadsheet_id)
    if not spreadsheet:
        raise HTTPException(status_code=404, detail="Spreadsheet not found")

    if sheet_index >= len(spreadsheet.sheets):
        raise HTTPException(status_code=400, detail="Sheet index out of range")

    sheet = spreadsheet.sheets[sheet_index]
    return {
        "id": spreadsheet.id,
        "name": spreadsheet.name,
        "sheet_id": sheet.id,
        "sheet_name": sheet.name,
        "data": sheet.data,
        "formats": sheet.formats,
        "column_widths": sheet.column_widths,
        "row_heights": sheet.row_heights,
        "frozen_rows": sheet.frozen_rows,
        "frozen_cols": sheet.frozen_cols,
        "conditional_formats": [cf.model_dump() for cf in sheet.conditional_formats],
        "data_validations": [dv.model_dump() for dv in sheet.data_validations],
    }


@router.put("/{spreadsheet_id}", response_model=SpreadsheetResponse)
async def update_spreadsheet(
    spreadsheet_id: str,
    request: UpdateSpreadsheetRequest,
    svc: SpreadsheetService = Depends(get_spreadsheet_service),
):
    """Update spreadsheet metadata."""
    spreadsheet = svc.update(
        spreadsheet_id=spreadsheet_id,
        name=request.name,
        metadata=request.metadata,
    )
    if not spreadsheet:
        raise HTTPException(status_code=404, detail="Spreadsheet not found")
    return _to_spreadsheet_response(spreadsheet)


@router.delete("/{spreadsheet_id}")
async def delete_spreadsheet(
    spreadsheet_id: str,
    svc: SpreadsheetService = Depends(get_spreadsheet_service),
):
    """Delete a spreadsheet."""
    success = svc.delete(spreadsheet_id)
    if not success:
        raise HTTPException(status_code=404, detail="Spreadsheet not found")
    return {"status": "ok", "message": "Spreadsheet deleted"}


# ============================================
# Cell Operations
# ============================================

@router.put("/{spreadsheet_id}/cells")
async def update_cells(
    spreadsheet_id: str,
    request: CellUpdateRequest,
    sheet_index: int = Query(0, ge=0),
    svc: SpreadsheetService = Depends(get_spreadsheet_service),
):
    """Update cell values."""
    updates = [{"row": u.row, "col": u.col, "value": u.value} for u in request.updates]
    spreadsheet = svc.update_cells(spreadsheet_id, sheet_index, updates)
    if not spreadsheet:
        raise HTTPException(status_code=404, detail="Spreadsheet not found")
    return {"status": "ok", "updated_count": len(updates)}


# ============================================
# Sheet Operations
# ============================================

@router.post("/{spreadsheet_id}/sheets", response_model=SheetResponse)
async def add_sheet(
    spreadsheet_id: str,
    request: AddSheetRequest,
    svc: SpreadsheetService = Depends(get_spreadsheet_service),
):
    """Add a new sheet to the spreadsheet."""
    sheet = svc.add_sheet(spreadsheet_id, request.name)
    if not sheet:
        raise HTTPException(status_code=404, detail="Spreadsheet not found")
    return SheetResponse(
        id=sheet.id,
        name=sheet.name,
        index=sheet.index,
        row_count=len(sheet.data),
        col_count=len(sheet.data[0]) if sheet.data else 0,
        frozen_rows=sheet.frozen_rows,
        frozen_cols=sheet.frozen_cols,
    )


@router.delete("/{spreadsheet_id}/sheets/{sheet_id}")
async def delete_sheet(
    spreadsheet_id: str,
    sheet_id: str,
    svc: SpreadsheetService = Depends(get_spreadsheet_service),
):
    """Delete a sheet from the spreadsheet."""
    success = svc.delete_sheet(spreadsheet_id, sheet_id)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot delete sheet (not found or last sheet)")
    return {"status": "ok", "message": "Sheet deleted"}


@router.put("/{spreadsheet_id}/sheets/{sheet_id}/rename")
async def rename_sheet(
    spreadsheet_id: str,
    sheet_id: str,
    name: str = Query(..., min_length=1, max_length=100),
    svc: SpreadsheetService = Depends(get_spreadsheet_service),
):
    """Rename a sheet."""
    success = svc.rename_sheet(spreadsheet_id, sheet_id, name)
    if not success:
        raise HTTPException(status_code=404, detail="Sheet not found")
    return {"status": "ok", "message": "Sheet renamed"}


@router.put("/{spreadsheet_id}/sheets/{sheet_id}/freeze")
async def freeze_panes(
    spreadsheet_id: str,
    sheet_id: str,
    request: FreezePanesRequest,
    svc: SpreadsheetService = Depends(get_spreadsheet_service),
):
    """Set frozen rows and columns."""
    success = svc.freeze_panes(spreadsheet_id, sheet_id, request.rows, request.cols)
    if not success:
        raise HTTPException(status_code=404, detail="Sheet not found")
    return {"status": "ok", "frozen_rows": request.rows, "frozen_cols": request.cols}


# ============================================
# Conditional Formatting
# ============================================

@router.post("/{spreadsheet_id}/sheets/{sheet_id}/conditional-format")
async def add_conditional_format(
    spreadsheet_id: str,
    sheet_id: str,
    request: ConditionalFormatRequest,
    svc: SpreadsheetService = Depends(get_spreadsheet_service),
):
    """Add conditional formatting rules."""
    import uuid
    from ...services.spreadsheets.service import ConditionalFormat, CellFormat

    for rule in request.rules:
        cf = ConditionalFormat(
            id=str(uuid.uuid4()),
            range=request.range,
            type=rule.type,
            value=rule.value,
            value2=rule.value2,
            format=CellFormat(**rule.format.model_dump()),
        )
        success = svc.set_conditional_format(spreadsheet_id, sheet_id, cf)
        if not success:
            raise HTTPException(status_code=404, detail="Sheet not found")

    return {"status": "ok", "message": "Conditional formatting applied"}


# ============================================
# Data Validation
# ============================================

@router.post("/{spreadsheet_id}/sheets/{sheet_id}/validation")
async def add_data_validation(
    spreadsheet_id: str,
    sheet_id: str,
    request: DataValidationRequest,
    svc: SpreadsheetService = Depends(get_spreadsheet_service),
):
    """Add data validation rules."""
    import uuid
    from ...services.spreadsheets.service import DataValidation

    dv = DataValidation(
        id=str(uuid.uuid4()),
        range=request.range,
        type=request.type,
        criteria=request.criteria,
        value=request.value,
        value2=request.value2,
        allow_blank=request.allow_blank,
        show_dropdown=request.show_dropdown,
        error_message=request.error_message,
    )
    success = svc.set_data_validation(spreadsheet_id, sheet_id, dv)
    if not success:
        raise HTTPException(status_code=404, detail="Sheet not found")

    return {"status": "ok", "message": "Data validation applied"}


# ============================================
# Import/Export
# ============================================

@router.post("/import")
async def import_spreadsheet(
    file: UploadFile = File(...),
    name: Optional[str] = Query(None),
    svc: SpreadsheetService = Depends(get_spreadsheet_service),
):
    """Import a spreadsheet from CSV or Excel file."""
    content = await file.read()
    filename = file.filename or "import"

    if filename.endswith(".csv"):
        spreadsheet = svc.import_csv(
            content.decode("utf-8"),
            name=name or filename.replace(".csv", ""),
        )
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format. Use CSV or XLSX.")

    return _to_spreadsheet_response(spreadsheet)


@router.get("/{spreadsheet_id}/export")
async def export_spreadsheet(
    spreadsheet_id: str,
    format: str = Query("csv", pattern="^(csv|tsv|xlsx)$"),
    sheet_index: int = Query(0, ge=0),
    svc: SpreadsheetService = Depends(get_spreadsheet_service),
):
    """Export a spreadsheet to CSV or Excel format."""
    delimiter = "\t" if format == "tsv" else ","
    content = svc.export_csv(spreadsheet_id, sheet_index, delimiter)
    if content is None:
        raise HTTPException(status_code=404, detail="Spreadsheet not found")

    spreadsheet = svc.get(spreadsheet_id)
    filename = f"{spreadsheet.name}.{format}"
    mime_type = "text/csv" if format in ["csv", "tsv"] else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    return StreamingResponse(
        io.StringIO(content),
        media_type=mime_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ============================================
# Pivot Tables
# ============================================

@router.post("/{spreadsheet_id}/pivot", response_model=PivotTableResponse)
async def create_pivot_table(
    spreadsheet_id: str,
    request: PivotTableRequest,
    sheet_index: int = Query(0, ge=0),
    svc: SpreadsheetService = Depends(get_spreadsheet_service),
    pivot_svc: PivotService = Depends(get_pivot_service),
):
    """Create a pivot table from spreadsheet data."""
    spreadsheet = svc.get(spreadsheet_id)
    if not spreadsheet:
        raise HTTPException(status_code=404, detail="Spreadsheet not found")

    if sheet_index >= len(spreadsheet.sheets):
        raise HTTPException(status_code=400, detail="Sheet index out of range")

    sheet = spreadsheet.sheets[sheet_index]

    # Convert sheet data to records
    records = pivot_svc.data_to_records(sheet.data)

    # Create pivot config
    from ...services.spreadsheets.pivot_service import PivotTableConfig, PivotValue, PivotFilter
    config = PivotTableConfig(
        id="",
        name=request.name,
        source_sheet_id=sheet.id,
        source_range=request.source_range,
        row_fields=request.row_fields,
        column_fields=request.column_fields,
        value_fields=[
            PivotValue(
                field=v.field,
                aggregation=v.aggregation,
                alias=v.alias,
            )
            for v in request.value_fields
        ],
        filters=[
            PivotFilter(
                field=f.field,
                values=f.values,
                exclude=f.exclude,
            )
            for f in request.filters
        ],
        show_grand_totals=request.show_grand_totals,
        show_row_totals=request.show_row_totals,
        show_col_totals=request.show_col_totals,
    )

    result = pivot_svc.compute_pivot(records, config)

    return PivotTableResponse(
        id=config.id,
        name=config.name,
        headers=result.headers,
        rows=result.rows,
        column_totals=result.column_totals,
        grand_total=result.grand_total,
    )


# ============================================
# Formula Evaluation
# ============================================

@router.post("/{spreadsheet_id}/evaluate")
async def evaluate_formula(
    spreadsheet_id: str,
    formula: str = Query(..., min_length=1),
    sheet_index: int = Query(0, ge=0),
    svc: SpreadsheetService = Depends(get_spreadsheet_service),
    engine: FormulaEngine = Depends(get_formula_engine),
):
    """Evaluate a formula against spreadsheet data."""
    spreadsheet = svc.get(spreadsheet_id)
    if not spreadsheet:
        raise HTTPException(status_code=404, detail="Spreadsheet not found")

    if sheet_index >= len(spreadsheet.sheets):
        raise HTTPException(status_code=400, detail="Sheet index out of range")

    sheet = spreadsheet.sheets[sheet_index]
    result = engine.evaluate(formula, sheet.data)

    return {
        "formula": formula,
        "value": result.value,
        "formatted_value": result.formatted_value,
        "error": result.error,
    }


# ============================================
# AI Features
# ============================================

@router.post("/{spreadsheet_id}/ai/formula", response_model=AIFormulaResponse)
async def generate_formula(
    spreadsheet_id: str,
    request: AIFormulaRequest,
    svc: SpreadsheetService = Depends(get_spreadsheet_service),
):
    """Generate a formula from natural language description."""
    spreadsheet = svc.get(spreadsheet_id)
    if not spreadsheet:
        raise HTTPException(status_code=404, detail="Spreadsheet not found")

    # TODO: Implement with OpenAI
    # For now, return a placeholder
    return AIFormulaResponse(
        formula=f"=SUM(A:A)",
        explanation=f"This formula calculates: {request.description}",
        example_result="100",
        confidence=0.9,
        alternatives=["=AVERAGE(A:A)", "=COUNT(A:A)"],
    )


@router.post("/{spreadsheet_id}/ai/explain")
async def explain_formula(
    spreadsheet_id: str,
    formula: str = Query(..., min_length=2),
):
    """Explain what a formula does in plain language."""
    # TODO: Implement with OpenAI
    return {
        "formula": formula,
        "explanation": f"This formula performs calculations.",
        "step_by_step": [
            "Step 1: Parse the formula",
            "Step 2: Evaluate references",
            "Step 3: Calculate result",
        ],
        "functions_used": [],
    }


@router.post("/{spreadsheet_id}/ai/clean")
async def suggest_data_cleaning(
    spreadsheet_id: str,
    sheet_index: int = Query(0, ge=0),
    column: Optional[str] = Query(None),
    svc: SpreadsheetService = Depends(get_spreadsheet_service),
):
    """Get AI suggestions for cleaning data."""
    spreadsheet = svc.get(spreadsheet_id)
    if not spreadsheet:
        raise HTTPException(status_code=404, detail="Spreadsheet not found")

    # TODO: Implement with OpenAI
    return {
        "issues": [],
        "suggestions": [],
    }


@router.post("/{spreadsheet_id}/ai/anomalies")
async def detect_anomalies(
    spreadsheet_id: str,
    sheet_index: int = Query(0, ge=0),
    column: str = Query(...),
    svc: SpreadsheetService = Depends(get_spreadsheet_service),
):
    """Detect anomalies in a column."""
    spreadsheet = svc.get(spreadsheet_id)
    if not spreadsheet:
        raise HTTPException(status_code=404, detail="Spreadsheet not found")

    # TODO: Implement anomaly detection
    return {
        "anomalies": [],
        "statistics": {},
        "narrative": "No anomalies detected.",
    }


# ============================================
# Helper Functions
# ============================================

def _to_spreadsheet_response(spreadsheet) -> SpreadsheetResponse:
    """Convert Spreadsheet model to response."""
    return SpreadsheetResponse(
        id=spreadsheet.id,
        name=spreadsheet.name,
        sheets=[
            SheetResponse(
                id=s.id,
                name=s.name,
                index=s.index,
                row_count=len(s.data),
                col_count=len(s.data[0]) if s.data else 0,
                frozen_rows=s.frozen_rows,
                frozen_cols=s.frozen_cols,
            )
            for s in spreadsheet.sheets
        ],
        created_at=spreadsheet.created_at,
        updated_at=spreadsheet.updated_at,
        owner_id=spreadsheet.owner_id,
        metadata=spreadsheet.metadata,
    )
