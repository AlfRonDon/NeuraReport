"""
Template entities - Immutable data structures for templates.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Optional


class TemplateStatus(str, Enum):
    """Template lifecycle status."""

    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    ARCHIVED = "archived"


class TemplateKind(str, Enum):
    """Type of template."""

    PDF = "pdf"
    EXCEL = "excel"


@dataclass(frozen=True)
class TemplateArtifacts:
    """Paths to template artifacts."""

    html_path: Path | None = None
    css_path: Path | None = None
    contract_path: Path | None = None
    preview_path: Path | None = None
    assets_dir: Path | None = None

    def to_dict(self) -> dict[str, str | None]:
        return {
            "html": str(self.html_path) if self.html_path else None,
            "css": str(self.css_path) if self.css_path else None,
            "contract": str(self.contract_path) if self.contract_path else None,
            "preview": str(self.preview_path) if self.preview_path else None,
            "assets": str(self.assets_dir) if self.assets_dir else None,
        }

    @classmethod
    def from_template_dir(cls, template_dir: Path) -> TemplateArtifacts:
        """Discover artifacts in a template directory."""
        html_path = template_dir / "template.html"
        css_path = template_dir / "styles.css"
        contract_path = template_dir / "contract.json"
        preview_path = template_dir / "preview.png"
        assets_dir = template_dir / "assets"

        return cls(
            html_path=html_path if html_path.exists() else None,
            css_path=css_path if css_path.exists() else None,
            contract_path=contract_path if contract_path.exists() else None,
            preview_path=preview_path if preview_path.exists() else None,
            assets_dir=assets_dir if assets_dir.exists() else None,
        )


@dataclass(frozen=True)
class Template:
    """
    A report template.

    Templates contain:
    - HTML template with token placeholders
    - CSS styles
    - Contract defining data mappings
    - Optional preview image
    """

    template_id: str
    name: str
    status: TemplateStatus = TemplateStatus.DRAFT
    kind: TemplateKind = TemplateKind.PDF
    description: str = ""
    tags: tuple[str, ...] = ()
    mapping_keys: tuple[str, ...] = ()
    artifacts: TemplateArtifacts = field(default_factory=TemplateArtifacts)
    last_connection_id: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    last_run_at: datetime | None = None

    def with_status(self, status: TemplateStatus) -> Template:
        """Return template with updated status."""
        return Template(
            template_id=self.template_id,
            name=self.name,
            status=status,
            kind=self.kind,
            description=self.description,
            tags=self.tags,
            mapping_keys=self.mapping_keys,
            artifacts=self.artifacts,
            last_connection_id=self.last_connection_id,
            created_at=self.created_at,
            updated_at=datetime.now(),
            last_run_at=self.last_run_at,
        )

    def with_artifacts(self, artifacts: TemplateArtifacts) -> Template:
        """Return template with updated artifacts."""
        return Template(
            template_id=self.template_id,
            name=self.name,
            status=self.status,
            kind=self.kind,
            description=self.description,
            tags=self.tags,
            mapping_keys=self.mapping_keys,
            artifacts=artifacts,
            last_connection_id=self.last_connection_id,
            created_at=self.created_at,
            updated_at=datetime.now(),
            last_run_at=self.last_run_at,
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.template_id,
            "name": self.name,
            "status": self.status.value,
            "kind": self.kind.value,
            "description": self.description,
            "tags": list(self.tags),
            "mappingKeys": list(self.mapping_keys),
            "artifacts": self.artifacts.to_dict(),
            "lastConnectionId": self.last_connection_id,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
            "lastRunAt": self.last_run_at.isoformat() if self.last_run_at else None,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Template:
        """Deserialize from dictionary."""
        artifacts_data = data.get("artifacts") or {}
        artifacts = TemplateArtifacts(
            html_path=Path(artifacts_data["html"]) if artifacts_data.get("html") else None,
            css_path=Path(artifacts_data["css"]) if artifacts_data.get("css") else None,
            contract_path=Path(artifacts_data["contract"]) if artifacts_data.get("contract") else None,
            preview_path=Path(artifacts_data["preview"]) if artifacts_data.get("preview") else None,
            assets_dir=Path(artifacts_data["assets"]) if artifacts_data.get("assets") else None,
        )

        return cls(
            template_id=data["id"],
            name=data.get("name", ""),
            status=TemplateStatus(data.get("status", "draft")),
            kind=TemplateKind(data.get("kind", "pdf")),
            description=data.get("description", ""),
            tags=tuple(data.get("tags", [])),
            mapping_keys=tuple(data.get("mappingKeys", [])),
            artifacts=artifacts,
            last_connection_id=data.get("lastConnectionId"),
            created_at=datetime.fromisoformat(data["createdAt"]) if data.get("createdAt") else None,
            updated_at=datetime.fromisoformat(data["updatedAt"]) if data.get("updatedAt") else None,
            last_run_at=datetime.fromisoformat(data["lastRunAt"]) if data.get("lastRunAt") else None,
        )
