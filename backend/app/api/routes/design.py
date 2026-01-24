"""Design API Routes.

REST API endpoints for brand kits and themes.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

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

router = APIRouter(prefix="/design", tags=["design"])


# Brand Kit endpoints


@router.post("/brand-kits", response_model=BrandKitResponse)
async def create_brand_kit(request: BrandKitCreate):
    """Create a new brand kit."""
    return await design_service.create_brand_kit(request)


@router.get("/brand-kits", response_model=list[BrandKitResponse])
async def list_brand_kits():
    """List all brand kits."""
    return await design_service.list_brand_kits()


@router.get("/brand-kits/{kit_id}", response_model=BrandKitResponse)
async def get_brand_kit(kit_id: str):
    """Get a brand kit by ID."""
    kit = await design_service.get_brand_kit(kit_id)
    if not kit:
        raise HTTPException(status_code=404, detail="Brand kit not found")
    return kit


@router.put("/brand-kits/{kit_id}", response_model=BrandKitResponse)
async def update_brand_kit(kit_id: str, request: BrandKitUpdate):
    """Update a brand kit."""
    kit = await design_service.update_brand_kit(kit_id, request)
    if not kit:
        raise HTTPException(status_code=404, detail="Brand kit not found")
    return kit


@router.delete("/brand-kits/{kit_id}")
async def delete_brand_kit(kit_id: str):
    """Delete a brand kit."""
    deleted = await design_service.delete_brand_kit(kit_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Brand kit not found")
    return {"status": "deleted", "id": kit_id}


@router.post("/brand-kits/{kit_id}/set-default", response_model=BrandKitResponse)
async def set_default_brand_kit(kit_id: str):
    """Set a brand kit as the default."""
    kit = await design_service.set_default_brand_kit(kit_id)
    if not kit:
        raise HTTPException(status_code=404, detail="Brand kit not found")
    return kit


@router.post("/brand-kits/{kit_id}/apply")
async def apply_brand_kit(kit_id: str, request: ApplyBrandKitRequest):
    """Apply brand kit to a document."""
    result = await design_service.apply_brand_kit(
        kit_id=kit_id,
        document_id=request.document_id,
        elements=request.elements,
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    return result


# Color palette endpoints


@router.post("/color-palette", response_model=ColorPaletteResponse)
async def generate_color_palette(request: ColorPaletteRequest):
    """Generate a color palette based on color harmony."""
    return design_service.generate_color_palette(
        base_color=request.base_color,
        harmony_type=request.harmony_type,
        count=request.count,
    )


# Theme endpoints


@router.post("/themes", response_model=ThemeResponse)
async def create_theme(request: ThemeCreate):
    """Create a new theme."""
    return await design_service.create_theme(request)


@router.get("/themes", response_model=list[ThemeResponse])
async def list_themes():
    """List all themes."""
    return await design_service.list_themes()


@router.get("/themes/{theme_id}", response_model=ThemeResponse)
async def get_theme(theme_id: str):
    """Get a theme by ID."""
    theme = await design_service.get_theme(theme_id)
    if not theme:
        raise HTTPException(status_code=404, detail="Theme not found")
    return theme


@router.put("/themes/{theme_id}", response_model=ThemeResponse)
async def update_theme(theme_id: str, request: ThemeUpdate):
    """Update a theme."""
    theme = await design_service.update_theme(theme_id, request)
    if not theme:
        raise HTTPException(status_code=404, detail="Theme not found")
    return theme


@router.delete("/themes/{theme_id}")
async def delete_theme(theme_id: str):
    """Delete a theme."""
    deleted = await design_service.delete_theme(theme_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Theme not found")
    return {"status": "deleted", "id": theme_id}


@router.post("/themes/{theme_id}/activate", response_model=ThemeResponse)
async def activate_theme(theme_id: str):
    """Set a theme as the active theme."""
    theme = await design_service.set_active_theme(theme_id)
    if not theme:
        raise HTTPException(status_code=404, detail="Theme not found")
    return theme
