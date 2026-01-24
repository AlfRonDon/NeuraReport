"""Design Service.

Brand kit and theme management service.
"""
from __future__ import annotations

import colorsys
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from backend.app.schemas.design.brand_kit import (
    BrandColor,
    BrandKitCreate,
    BrandKitResponse,
    BrandKitUpdate,
    ColorPaletteResponse,
    ThemeCreate,
    ThemeResponse,
    ThemeUpdate,
    Typography,
)

logger = logging.getLogger(__name__)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    """Convert hex color to RGB tuple."""
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def _rgb_to_hex(rgb: tuple[int, int, int]) -> str:
    """Convert RGB tuple to hex color."""
    return "#{:02x}{:02x}{:02x}".format(*rgb)


def _rgb_to_hsl(r: int, g: int, b: int) -> tuple[float, float, float]:
    """Convert RGB to HSL."""
    r, g, b = r / 255.0, g / 255.0, b / 255.0
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    return h * 360, s * 100, l * 100


def _hsl_to_rgb(h: float, s: float, l: float) -> tuple[int, int, int]:
    """Convert HSL to RGB."""
    h, s, l = h / 360.0, s / 100.0, l / 100.0
    r, g, b = colorsys.hls_to_rgb(h, l, s)
    return int(r * 255), int(g * 255), int(b * 255)


class DesignService:
    """Service for managing brand kits and themes."""

    def __init__(self):
        self._brand_kits: dict[str, dict] = {}
        self._themes: dict[str, dict] = {}
        self._default_brand_kit_id: Optional[str] = None
        self._active_theme_id: Optional[str] = None

    async def create_brand_kit(
        self,
        request: BrandKitCreate,
    ) -> BrandKitResponse:
        """Create a new brand kit."""
        kit_id = str(uuid.uuid4())
        now = _now()

        kit = {
            "id": kit_id,
            "name": request.name,
            "description": request.description,
            "logo_url": request.logo_url,
            "logo_dark_url": request.logo_dark_url,
            "favicon_url": request.favicon_url,
            "primary_color": request.primary_color,
            "secondary_color": request.secondary_color,
            "accent_color": request.accent_color,
            "text_color": request.text_color,
            "background_color": request.background_color,
            "colors": [c.model_dump() for c in request.colors],
            "typography": request.typography.model_dump(),
            "created_at": now,
            "updated_at": now,
            "is_default": len(self._brand_kits) == 0,
        }

        self._brand_kits[kit_id] = kit

        # Set as default if first
        if kit["is_default"]:
            self._default_brand_kit_id = kit_id

        # Persist to state store
        try:
            from backend.app.repositories.state.store import state_store
            with state_store.transaction() as state:
                state["brand_kits"][kit_id] = kit
        except Exception as e:
            logger.warning(f"Failed to persist brand kit: {e}")

        return self._to_brand_kit_response(kit)

    async def get_brand_kit(self, kit_id: str) -> Optional[BrandKitResponse]:
        """Get a brand kit by ID."""
        kit = self._brand_kits.get(kit_id)
        if not kit:
            # Try loading from state store
            try:
                from backend.app.repositories.state.store import state_store
                with state_store._lock:
                    state = state_store._read_state()
                    kit = state.get("brand_kits", {}).get(kit_id)
                    if kit:
                        self._brand_kits[kit_id] = kit
            except Exception:
                pass

        if not kit:
            return None
        return self._to_brand_kit_response(kit)

    async def list_brand_kits(self) -> list[BrandKitResponse]:
        """List all brand kits."""
        # Load from state store
        try:
            from backend.app.repositories.state.store import state_store
            with state_store._lock:
                state = state_store._read_state()
                self._brand_kits.update(state.get("brand_kits", {}))
        except Exception:
            pass

        kits = list(self._brand_kits.values())
        kits.sort(key=lambda k: k.get("created_at", ""), reverse=True)
        return [self._to_brand_kit_response(k) for k in kits]

    async def update_brand_kit(
        self,
        kit_id: str,
        request: BrandKitUpdate,
    ) -> Optional[BrandKitResponse]:
        """Update a brand kit."""
        kit = self._brand_kits.get(kit_id)
        if not kit:
            return None

        if request.name is not None:
            kit["name"] = request.name
        if request.description is not None:
            kit["description"] = request.description
        if request.logo_url is not None:
            kit["logo_url"] = request.logo_url
        if request.logo_dark_url is not None:
            kit["logo_dark_url"] = request.logo_dark_url
        if request.favicon_url is not None:
            kit["favicon_url"] = request.favicon_url
        if request.primary_color is not None:
            kit["primary_color"] = request.primary_color
        if request.secondary_color is not None:
            kit["secondary_color"] = request.secondary_color
        if request.accent_color is not None:
            kit["accent_color"] = request.accent_color
        if request.text_color is not None:
            kit["text_color"] = request.text_color
        if request.background_color is not None:
            kit["background_color"] = request.background_color
        if request.colors is not None:
            kit["colors"] = [c.model_dump() for c in request.colors]
        if request.typography is not None:
            kit["typography"] = request.typography.model_dump()

        kit["updated_at"] = _now()

        # Persist
        try:
            from backend.app.repositories.state.store import state_store
            with state_store.transaction() as state:
                state["brand_kits"][kit_id] = kit
        except Exception as e:
            logger.warning(f"Failed to persist brand kit update: {e}")

        return self._to_brand_kit_response(kit)

    async def delete_brand_kit(self, kit_id: str) -> bool:
        """Delete a brand kit."""
        if kit_id not in self._brand_kits:
            return False

        del self._brand_kits[kit_id]

        if self._default_brand_kit_id == kit_id:
            self._default_brand_kit_id = None

        # Remove from state store
        try:
            from backend.app.repositories.state.store import state_store
            with state_store.transaction() as state:
                state["brand_kits"].pop(kit_id, None)
        except Exception as e:
            logger.warning(f"Failed to delete brand kit from state: {e}")

        return True

    async def set_default_brand_kit(self, kit_id: str) -> Optional[BrandKitResponse]:
        """Set a brand kit as the default."""
        kit = self._brand_kits.get(kit_id)
        if not kit:
            return None

        # Remove default from previous
        if self._default_brand_kit_id and self._default_brand_kit_id != kit_id:
            prev = self._brand_kits.get(self._default_brand_kit_id)
            if prev:
                prev["is_default"] = False

        kit["is_default"] = True
        self._default_brand_kit_id = kit_id

        return self._to_brand_kit_response(kit)

    async def apply_brand_kit(
        self,
        kit_id: str,
        document_id: str,
        elements: list[str] = None,
    ) -> dict:
        """Apply brand kit to a document."""
        kit = self._brand_kits.get(kit_id)
        if not kit:
            return {"success": False, "error": "Brand kit not found"}

        # This would apply the brand kit styling to a document
        # Implementation depends on document type and storage

        return {
            "success": True,
            "document_id": document_id,
            "brand_kit_id": kit_id,
            "elements_applied": elements or ["all"],
        }

    def generate_color_palette(
        self,
        base_color: str,
        harmony_type: str = "complementary",
        count: int = 5,
    ) -> ColorPaletteResponse:
        """Generate a color palette based on color harmony."""
        rgb = _hex_to_rgb(base_color)
        h, s, l = _rgb_to_hsl(*rgb)

        colors = [BrandColor(name="Base", hex=base_color, rgb=rgb)]

        if harmony_type == "complementary":
            # Opposite on color wheel
            comp_h = (h + 180) % 360
            comp_rgb = _hsl_to_rgb(comp_h, s, l)
            colors.append(BrandColor(
                name="Complementary",
                hex=_rgb_to_hex(comp_rgb),
                rgb=comp_rgb
            ))

        elif harmony_type == "analogous":
            # Adjacent colors
            for i, offset in enumerate([-30, 30]):
                adj_h = (h + offset) % 360
                adj_rgb = _hsl_to_rgb(adj_h, s, l)
                colors.append(BrandColor(
                    name=f"Analogous {i+1}",
                    hex=_rgb_to_hex(adj_rgb),
                    rgb=adj_rgb
                ))

        elif harmony_type == "triadic":
            # Three colors equally spaced
            for i in range(1, 3):
                tri_h = (h + i * 120) % 360
                tri_rgb = _hsl_to_rgb(tri_h, s, l)
                colors.append(BrandColor(
                    name=f"Triadic {i}",
                    hex=_rgb_to_hex(tri_rgb),
                    rgb=tri_rgb
                ))

        elif harmony_type == "split-complementary":
            # Complementary with adjacent colors
            for offset in [150, 210]:
                split_h = (h + offset) % 360
                split_rgb = _hsl_to_rgb(split_h, s, l)
                colors.append(BrandColor(
                    name=f"Split {offset}",
                    hex=_rgb_to_hex(split_rgb),
                    rgb=split_rgb
                ))

        elif harmony_type == "tetradic":
            # Four colors in rectangle
            for offset in [90, 180, 270]:
                tet_h = (h + offset) % 360
                tet_rgb = _hsl_to_rgb(tet_h, s, l)
                colors.append(BrandColor(
                    name=f"Tetradic {offset}",
                    hex=_rgb_to_hex(tet_rgb),
                    rgb=tet_rgb
                ))

        # Add lighter/darker variants to reach count
        while len(colors) < count:
            variant_l = max(10, l - (len(colors) - 1) * 10) if len(colors) % 2 == 0 else min(90, l + (len(colors) - 1) * 10)
            var_rgb = _hsl_to_rgb(h, s, variant_l)
            colors.append(BrandColor(
                name=f"Shade {len(colors)}",
                hex=_rgb_to_hex(var_rgb),
                rgb=var_rgb
            ))

        return ColorPaletteResponse(
            base_color=base_color,
            harmony_type=harmony_type,
            colors=colors[:count],
        )

    # Theme methods

    async def create_theme(self, request: ThemeCreate) -> ThemeResponse:
        """Create a new theme."""
        theme_id = str(uuid.uuid4())
        now = _now()

        theme = {
            "id": theme_id,
            "name": request.name,
            "description": request.description,
            "brand_kit_id": request.brand_kit_id,
            "mode": request.mode,
            "colors": request.colors,
            "typography": request.typography,
            "spacing": request.spacing,
            "borders": request.borders,
            "shadows": request.shadows,
            "created_at": now,
            "updated_at": now,
            "is_active": len(self._themes) == 0,
        }

        self._themes[theme_id] = theme

        if theme["is_active"]:
            self._active_theme_id = theme_id

        # Persist
        try:
            from backend.app.repositories.state.store import state_store
            with state_store.transaction() as state:
                state["themes"][theme_id] = theme
        except Exception as e:
            logger.warning(f"Failed to persist theme: {e}")

        return self._to_theme_response(theme)

    async def get_theme(self, theme_id: str) -> Optional[ThemeResponse]:
        """Get a theme by ID."""
        theme = self._themes.get(theme_id)
        if not theme:
            return None
        return self._to_theme_response(theme)

    async def list_themes(self) -> list[ThemeResponse]:
        """List all themes."""
        try:
            from backend.app.repositories.state.store import state_store
            with state_store._lock:
                state = state_store._read_state()
                self._themes.update(state.get("themes", {}))
        except Exception:
            pass

        themes = list(self._themes.values())
        themes.sort(key=lambda t: t.get("created_at", ""), reverse=True)
        return [self._to_theme_response(t) for t in themes]

    async def update_theme(
        self,
        theme_id: str,
        request: ThemeUpdate,
    ) -> Optional[ThemeResponse]:
        """Update a theme."""
        theme = self._themes.get(theme_id)
        if not theme:
            return None

        for field in ["name", "description", "brand_kit_id", "mode", "colors",
                      "typography", "spacing", "borders", "shadows"]:
            value = getattr(request, field, None)
            if value is not None:
                theme[field] = value

        theme["updated_at"] = _now()

        try:
            from backend.app.repositories.state.store import state_store
            with state_store.transaction() as state:
                state["themes"][theme_id] = theme
        except Exception as e:
            logger.warning(f"Failed to persist theme update: {e}")

        return self._to_theme_response(theme)

    async def delete_theme(self, theme_id: str) -> bool:
        """Delete a theme."""
        if theme_id not in self._themes:
            return False

        del self._themes[theme_id]

        if self._active_theme_id == theme_id:
            self._active_theme_id = None

        try:
            from backend.app.repositories.state.store import state_store
            with state_store.transaction() as state:
                state["themes"].pop(theme_id, None)
        except Exception:
            pass

        return True

    async def set_active_theme(self, theme_id: str) -> Optional[ThemeResponse]:
        """Set a theme as active."""
        theme = self._themes.get(theme_id)
        if not theme:
            return None

        if self._active_theme_id and self._active_theme_id != theme_id:
            prev = self._themes.get(self._active_theme_id)
            if prev:
                prev["is_active"] = False

        theme["is_active"] = True
        self._active_theme_id = theme_id

        return self._to_theme_response(theme)

    def _to_brand_kit_response(self, kit: dict) -> BrandKitResponse:
        """Convert brand kit dict to response model."""
        return BrandKitResponse(
            id=kit["id"],
            name=kit["name"],
            description=kit.get("description"),
            logo_url=kit.get("logo_url"),
            logo_dark_url=kit.get("logo_dark_url"),
            favicon_url=kit.get("favicon_url"),
            primary_color=kit["primary_color"],
            secondary_color=kit["secondary_color"],
            accent_color=kit["accent_color"],
            text_color=kit["text_color"],
            background_color=kit["background_color"],
            colors=[BrandColor(**c) for c in kit.get("colors", [])],
            typography=Typography(**kit.get("typography", {})),
            created_at=kit["created_at"],
            updated_at=kit["updated_at"],
            is_default=kit.get("is_default", False),
        )

    def _to_theme_response(self, theme: dict) -> ThemeResponse:
        """Convert theme dict to response model."""
        return ThemeResponse(
            id=theme["id"],
            name=theme["name"],
            description=theme.get("description"),
            brand_kit_id=theme.get("brand_kit_id"),
            mode=theme.get("mode", "light"),
            colors=theme.get("colors", {}),
            typography=theme.get("typography", {}),
            spacing=theme.get("spacing", {}),
            borders=theme.get("borders", {}),
            shadows=theme.get("shadows", {}),
            created_at=theme["created_at"],
            updated_at=theme["updated_at"],
            is_active=theme.get("is_active", False),
        )


# Singleton instance
design_service = DesignService()
