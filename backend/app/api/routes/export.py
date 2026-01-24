"""Export API Routes.

REST API endpoints for document export and distribution.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from backend.app.schemas.export.export import (
    BulkExportRequest,
    DistributionRequest,
    DistributionResponse,
    EmailCampaignRequest,
    EmbedGenerateRequest,
    EmbedResponse,
    ExportRequest,
    ExportResponse,
    ExportStatus,
    PortalPublishRequest,
    SlackMessageRequest,
    TeamsMessageRequest,
    WebhookDeliveryRequest,
)
from backend.app.services.export.service import distribution_service, export_service

router = APIRouter(prefix="/export", tags=["export"])


@router.post("/{document_id}/pdf")
async def export_to_pdf(document_id: str, options: dict = None):
    """Export document to PDF format."""
    job = await export_service.create_export_job(
        document_id=document_id,
        format="pdf",
        options=options or {},
    )
    return job


@router.post("/{document_id}/pdfa")
async def export_to_pdfa(document_id: str, options: dict = None):
    """Export document to PDF/A archival format."""
    opts = options or {}
    opts["pdfa_compliant"] = True
    job = await export_service.create_export_job(
        document_id=document_id,
        format="pdfa",
        options=opts,
    )
    return job


@router.post("/{document_id}/docx")
async def export_to_docx(document_id: str, options: dict = None):
    """Export document to Word DOCX format."""
    job = await export_service.create_export_job(
        document_id=document_id,
        format="docx",
        options=options or {},
    )
    return job


@router.post("/{document_id}/pptx")
async def export_to_pptx(document_id: str, options: dict = None):
    """Export document to PowerPoint format."""
    job = await export_service.create_export_job(
        document_id=document_id,
        format="pptx",
        options=options or {},
    )
    return job


@router.post("/{document_id}/epub")
async def export_to_epub(document_id: str, options: dict = None):
    """Export document to ePub format."""
    job = await export_service.create_export_job(
        document_id=document_id,
        format="epub",
        options=options or {},
    )
    return job


@router.post("/{document_id}/latex")
async def export_to_latex(document_id: str, options: dict = None):
    """Export document to LaTeX format."""
    job = await export_service.create_export_job(
        document_id=document_id,
        format="latex",
        options=options or {},
    )
    return job


@router.post("/{document_id}/markdown")
async def export_to_markdown(document_id: str, options: dict = None):
    """Export document to Markdown format."""
    job = await export_service.create_export_job(
        document_id=document_id,
        format="markdown",
        options=options or {},
    )
    return job


@router.post("/{document_id}/html")
async def export_to_html(document_id: str, options: dict = None):
    """Export document to HTML format."""
    job = await export_service.create_export_job(
        document_id=document_id,
        format="html",
        options=options or {},
    )
    return job


@router.post("/bulk")
async def bulk_export(request: BulkExportRequest):
    """Export multiple documents as a ZIP file."""
    job = await export_service.bulk_export(
        document_ids=request.document_ids,
        format=request.format.value,
        options=request.options,
    )
    return job


@router.get("/jobs/{job_id}")
async def get_export_job(job_id: str):
    """Get export job status."""
    job = await export_service.get_export_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Export job not found")
    return job


# Distribution endpoints


@router.post("/distribution/email-campaign")
async def email_campaign(request: EmailCampaignRequest):
    """Send documents via bulk email campaign."""
    results = []
    for doc_id in request.document_ids:
        result = await distribution_service.send_email(
            document_id=doc_id,
            recipients=request.recipients,
            subject=request.subject,
            message=request.message,
        )
        results.append(result)

    return {
        "campaign_id": results[0]["job_id"] if results else None,
        "documents_sent": len(results),
        "recipients_count": len(request.recipients),
        "results": results,
    }


@router.post("/distribution/portal/{document_id}")
async def publish_to_portal(document_id: str, request: PortalPublishRequest):
    """Publish document to portal."""
    result = await distribution_service.publish_to_portal(
        document_id=document_id,
        portal_path=request.portal_path,
        options={
            "title": request.title,
            "description": request.description,
            "tags": request.tags,
            "public": request.public,
            "password": request.password,
            "expires_at": request.expires_at,
        },
    )
    return result


@router.post("/distribution/embed/{document_id}", response_model=EmbedResponse)
async def generate_embed(document_id: str, request: EmbedGenerateRequest):
    """Generate embed code for a document."""
    result = await export_service.generate_embed_token(
        document_id=document_id,
        options={
            "width": request.width,
            "height": request.height,
            "allow_download": request.allow_download,
            "allow_print": request.allow_print,
            "show_toolbar": request.show_toolbar,
            "theme": request.theme,
        },
    )
    return EmbedResponse(**result)


@router.post("/distribution/slack")
async def send_to_slack(request: SlackMessageRequest):
    """Send document to Slack channel."""
    result = await distribution_service.send_to_slack(
        document_id=request.document_id,
        channel=request.channel,
        message=request.message,
    )
    return result


@router.post("/distribution/teams")
async def send_to_teams(request: TeamsMessageRequest):
    """Send document to Microsoft Teams."""
    result = await distribution_service.send_to_teams(
        document_id=request.document_id,
        webhook_url=request.webhook_url,
        title=request.title,
        message=request.message,
    )
    return result


@router.post("/distribution/webhook")
async def send_webhook(request: WebhookDeliveryRequest):
    """Deliver document via webhook."""
    result = await distribution_service.send_webhook(
        document_id=request.document_id,
        webhook_url=request.webhook_url,
        method=request.method,
        headers=request.headers,
    )
    return result
