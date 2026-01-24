"""Brand Kit and Design Schemas.

Pydantic models for brand kit and theme management.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class BrandColor(BaseModel):
    """A brand color definition."""
    name: str
    hex: str
    rgb: Optional[tuple[int, int, int]] = None


class Typography(BaseModel):
    """Typography settings."""
    font_family: str = "Inter"
    heading_font: Optional[str] = None
    body_font: Optional[str] = None
    code_font: str = "Source Code Pro"
    base_size: int = 16
    scale_ratio: float = 1.25


class BrandKitCreate(BaseModel):
    """Request to create a brand kit."""
    name: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    logo_dark_url: Optional[str] = None
    favicon_url: Optional[str] = None
    primary_color: str = "#1976d2"
    secondary_color: str = "#dc004e"
    accent_color: str = "#ff9800"
    text_color: str = "#333333"
    background_color: str = "#ffffff"
    colors: list[BrandColor] = Field(default_factory=list)
    typography: Typography = Field(default_factory=Typography)


class BrandKitUpdate(BaseModel):
    """Request to update a brand kit."""
    name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    logo_dark_url: Optional[str] = None
    favicon_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    accent_color: Optional[str] = None
    text_color: Optional[str] = None
    background_color: Optional[str] = None
    colors: Optional[list[BrandColor]] = None
    typography: Optional[Typography] = None


class BrandKitResponse(BaseModel):
    """Brand kit response model."""
    id: str
    name: str
    description: Optional[str]
    logo_url: Optional[str]
    logo_dark_url: Optional[str]
    favicon_url: Optional[str]
    primary_color: str
    secondary_color: str
    accent_color: str
    text_color: str
    background_color: str
    colors: list[BrandColor]
    typography: Typography
    created_at: datetime
    updated_at: datetime
    is_default: bool = False


class ThemeCreate(BaseModel):
    """Request to create a theme."""
    name: str
    description: Optional[str] = None
    brand_kit_id: Optional[str] = None
    mode: str = "light"  # light, dark, auto
    colors: dict[str, str] = Field(default_factory=dict)
    typography: dict[str, Any] = Field(default_factory=dict)
    spacing: dict[str, Any] = Field(default_factory=dict)
    borders: dict[str, Any] = Field(default_factory=dict)
    shadows: dict[str, Any] = Field(default_factory=dict)


class ThemeUpdate(BaseModel):
    """Request to update a theme."""
    name: Optional[str] = None
    description: Optional[str] = None
    brand_kit_id: Optional[str] = None
    mode: Optional[str] = None
    colors: Optional[dict[str, str]] = None
    typography: Optional[dict[str, Any]] = None
    spacing: Optional[dict[str, Any]] = None
    borders: Optional[dict[str, Any]] = None
    shadows: Optional[dict[str, Any]] = None


class ThemeResponse(BaseModel):
    """Theme response model."""
    id: str
    name: str
    description: Optional[str]
    brand_kit_id: Optional[str]
    mode: str
    colors: dict[str, str]
    typography: dict[str, Any]
    spacing: dict[str, Any]
    borders: dict[str, Any]
    shadows: dict[str, Any]
    created_at: datetime
    updated_at: datetime
    is_active: bool = False


class ColorPaletteRequest(BaseModel):
    """Request to generate a color palette."""
    base_color: str
    harmony_type: str = "complementary"  # complementary, analogous, triadic, split-complementary, tetradic
    count: int = 5


class ColorPaletteResponse(BaseModel):
    """Generated color palette."""
    base_color: str
    harmony_type: str
    colors: list[BrandColor]


class ApplyBrandKitRequest(BaseModel):
    """Request to apply brand kit to a document."""
    document_id: str
    elements: list[str] = Field(default_factory=list)  # Which elements to apply to
