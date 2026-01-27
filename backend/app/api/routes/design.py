"""Design API Routes.

REST API endpoints for brand kits and themes.
"""
from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.app.schemas.design.brand_kit import (
    ApplyBrandKitRequest,
    BrandKitCreate,
    BrandKitResponse,
    BrandKitUpdate,
    ColorPaletteRequest,
    ColorPaletteResponse,
    ThemeCreate,
    ThemeResponse,
    ThemeUpdate,
)
from backend.app.services.design.service import design_service
from backend.app.services.security import require_api_key

logger = logging.getLogger("neura.api.design")

router = APIRouter(tags=["design"], dependencies=[Depends(require_api_key)])


def _handle_design_error(exc: Exception, operation: str) -> HTTPException:
    """Map design service errors to HTTP status codes."""
    logger.error("%s failed: %s", operation, exc, exc_info=True)
    return HTTPException(
        status_code=500,
        detail=f"{operation} failed due to an internal error.",
    )


# Brand Kit endpoints


@router.post("/brand-kits", response_model=BrandKitResponse)
async def create_brand_kit(request: BrandKitCreate):
    """Create a new brand kit."""
    try:
        return await design_service.create_brand_kit(request)
    except HTTPException:
        raise
    except Exception as exc:
        raise _handle_design_error(exc, "Brand kit creation") from exc


@router.get("/brand-kits", response_model=list[BrandKitResponse])
async def list_brand_kits(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List all brand kits."""
    try:
        all_kits = await design_service.list_brand_kits()
        return all_kits[offset:offset + limit]
    except HTTPException:
        raise
    except Exception as exc:
        raise _handle_design_error(exc, "Brand kit listing") from exc


@router.get("/brand-kits/{kit_id}", response_model=BrandKitResponse)
async def get_brand_kit(kit_id: str):
    """Get a brand kit by ID."""
    try:
        kit = await design_service.get_brand_kit(kit_id)
        if not kit:
            raise HTTPException(status_code=404, detail="Brand kit not found")
        return kit
    except HTTPException:
        raise
    except Exception as exc:
        raise _handle_design_error(exc, "Brand kit retrieval") from exc


@router.put("/brand-kits/{kit_id}", response_model=BrandKitResponse)
async def update_brand_kit(kit_id: str, request: BrandKitUpdate):
    """Update a brand kit."""
    try:
        kit = await design_service.update_brand_kit(kit_id, request)
        if not kit:
            raise HTTPException(status_code=404, detail="Brand kit not found")
        return kit
    except HTTPException:
        raise
    except Exception as exc:
        raise _handle_design_error(exc, "Brand kit update") from exc


@router.delete("/brand-kits/{kit_id}")
async def delete_brand_kit(kit_id: str):
    """Delete a brand kit."""
    try:
        deleted = await design_service.delete_brand_kit(kit_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Brand kit not found")
        return {"status": "deleted", "id": kit_id}
    except HTTPException:
        raise
    except Exception as exc:
        raise _handle_design_error(exc, "Brand kit deletion") from exc


@router.post("/brand-kits/{kit_id}/set-default", response_model=BrandKitResponse)
async def set_default_brand_kit(kit_id: str):
    """Set a brand kit as the default."""
    try:
        kit = await design_service.set_default_brand_kit(kit_id)
        if not kit:
            raise HTTPException(status_code=404, detail="Brand kit not found")
        return kit
    except HTTPException:
        raise
    except Exception as exc:
        raise _handle_design_error(exc, "Set default brand kit") from exc


@router.post("/brand-kits/{kit_id}/apply")
async def apply_brand_kit(kit_id: str, request: ApplyBrandKitRequest):
    """Apply brand kit to a document."""
    try:
        result = await design_service.apply_brand_kit(
            kit_id=kit_id,
            document_id=request.document_id,
            elements=request.elements,
        )
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise _handle_design_error(exc, "Apply brand kit") from exc


# Color palette endpoints


@router.post("/color-palette", response_model=ColorPaletteResponse)
async def generate_color_palette(request: ColorPaletteRequest):
    """Generate a color palette based on color harmony."""
    try:
        return await asyncio.to_thread(
            design_service.generate_color_palette,
            base_color=request.base_color,
            harmony_type=request.harmony_type,
            count=request.count,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise _handle_design_error(exc, "Color palette generation") from exc


# Theme endpoints


@router.post("/themes", response_model=ThemeResponse)
async def create_theme(request: ThemeCreate):
    """Create a new theme."""
    try:
        return await design_service.create_theme(request)
    except HTTPException:
        raise
    except Exception as exc:
        raise _handle_design_error(exc, "Theme creation") from exc


@router.get("/themes", response_model=list[ThemeResponse])
async def list_themes(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List all themes."""
    try:
        all_themes = await design_service.list_themes()
        return all_themes[offset:offset + limit]
    except HTTPException:
        raise
    except Exception as exc:
        raise _handle_design_error(exc, "Theme listing") from exc


@router.get("/themes/{theme_id}", response_model=ThemeResponse)
async def get_theme(theme_id: str):
    """Get a theme by ID."""
    try:
        theme = await design_service.get_theme(theme_id)
        if not theme:
            raise HTTPException(status_code=404, detail="Theme not found")
        return theme
    except HTTPException:
        raise
    except Exception as exc:
        raise _handle_design_error(exc, "Theme retrieval") from exc


@router.put("/themes/{theme_id}", response_model=ThemeResponse)
async def update_theme(theme_id: str, request: ThemeUpdate):
    """Update a theme."""
    try:
        theme = await design_service.update_theme(theme_id, request)
        if not theme:
            raise HTTPException(status_code=404, detail="Theme not found")
        return theme
    except HTTPException:
        raise
    except Exception as exc:
        raise _handle_design_error(exc, "Theme update") from exc


@router.delete("/themes/{theme_id}")
async def delete_theme(theme_id: str):
    """Delete a theme."""
    try:
        deleted = await design_service.delete_theme(theme_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Theme not found")
        return {"status": "deleted", "id": theme_id}
    except HTTPException:
        raise
    except Exception as exc:
        raise _handle_design_error(exc, "Theme deletion") from exc


@router.post("/themes/{theme_id}/activate", response_model=ThemeResponse)
async def activate_theme(theme_id: str):
    """Set a theme as the active theme."""
    try:
        theme = await design_service.set_active_theme(theme_id)
        if not theme:
            raise HTTPException(status_code=404, detail="Theme not found")
        return theme
    except HTTPException:
        raise
    except Exception as exc:
        raise _handle_design_error(exc, "Theme activation") from exc
