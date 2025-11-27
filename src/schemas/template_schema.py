from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel


class TemplateManualEditPayload(BaseModel):
    html: str


class TemplateAiEditPayload(BaseModel):
    instructions: str
    html: Optional[str] = None


class MappingPayload(BaseModel):
    mapping: dict[str, str]
    connection_id: Optional[str] = None
    user_values_text: Optional[str] = None
    user_instructions: Optional[str] = None
    dialect_hint: Optional[str] = None
    catalog_allowlist: Optional[list[str]] = None
    params_spec: Optional[list[str]] = None
    sample_params: Optional[dict[str, Any]] = None
    generator_dialect: Optional[str] = None
    force_generator_rebuild: bool = False
    keys: Optional[list[str]] = None

    class Config:
        extra = "allow"


class GeneratorAssetsPayload(BaseModel):
    step4_output: Optional[dict[str, Any]] = None
    contract: Optional[dict[str, Any]] = None
    overview_md: Optional[str] = None
    final_template_html: Optional[str] = None
    reference_pdf_image: Optional[str] = None
    catalog: Optional[list[str]] = None
    dialect: Optional[str] = "duckdb"
    params: Optional[list[str]] = None
    sample_params: Optional[dict[str, Any]] = None
    force_rebuild: bool = False
    key_tokens: Optional[list[str]] = None

    class Config:
        extra = "allow"


class CorrectionsPreviewPayload(BaseModel):
    user_input: Optional[str] = ""
    page: int = 1
    mapping_override: Optional[dict[str, Any]] = None
    sample_tokens: Optional[list[str]] = None
    model_selector: Optional[str] = None

    class Config:
        extra = "allow"


class TemplateRecommendPayload(BaseModel):
    requirement: str
    kind: Optional[str] = None
    domain: Optional[str] = None
    schema_snapshot: Optional[dict[str, Any]] = None
    tables: Optional[list[str]] = None

    class Config:
        extra = "allow"


class TemplateRecommendation(BaseModel):
    template: dict[str, Any]
    explanation: str
    score: float


class TemplateRecommendResponse(BaseModel):
    recommendations: list[TemplateRecommendation]
