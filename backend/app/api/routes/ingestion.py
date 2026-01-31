"""
Document Ingestion API Routes
Endpoints for importing documents from various sources.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile, status
from pydantic import BaseModel, Field

from backend.app.api.middleware import limiter, RATE_LIMIT_STRICT

from backend.app.services.ingestion import (
    ingestion_service,
    email_ingestion_service,
    web_clipper_service,
    folder_watcher_service,
    transcription_service,
)
from backend.app.services.ingestion.folder_watcher import WatcherConfig
from backend.app.services.ingestion.transcription import TranscriptionLanguage

logger = logging.getLogger(__name__)
router = APIRouter()

# Maximum upload sizes
MAX_SINGLE_FILE_BYTES = 200 * 1024 * 1024  # 200 MB
MAX_BULK_TOTAL_BYTES = 500 * 1024 * 1024   # 500 MB total for bulk


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

class IngestUrlRequest(BaseModel):
    url: str = Field(..., description="URL to download and ingest")
    filename: Optional[str] = Field(default=None, description="Override filename")


class IngestStructuredDataRequest(BaseModel):
    filename: str = Field(..., description="File name with extension")
    content: str = Field(..., description="File content (JSON/XML/YAML)")
    format_hint: Optional[str] = Field(default=None, description="Format hint")


class ClipUrlRequest(BaseModel):
    url: str = Field(..., description="URL to clip")
    include_images: bool = Field(default=True, description="Include images")
    clean_content: bool = Field(default=True, description="Clean HTML")
    output_format: str = Field(default="html", description="Output format")


class ClipSelectionRequest(BaseModel):
    url: str = Field(..., description="Source URL")
    selected_html: str = Field(..., description="Selected HTML content")
    page_title: Optional[str] = Field(default=None, description="Page title")


class CreateWatcherRequest(BaseModel):
    path: str = Field(..., description="Folder path to watch")
    recursive: bool = Field(default=True, description="Watch subdirectories")
    patterns: List[str] = Field(default=["*"], description="File patterns to match")
    ignore_patterns: List[str] = Field(default_factory=list, description="Patterns to ignore")
    auto_import: bool = Field(default=True, description="Auto-import files")
    delete_after_import: bool = Field(default=False, description="Delete after import")
    target_collection: Optional[str] = Field(default=None, description="Target collection")
    tags: List[str] = Field(default_factory=list, description="Tags to apply")


class TranscribeRequest(BaseModel):
    language: str = Field(default="auto", description="Language code or 'auto'")
    include_timestamps: bool = Field(default=True, description="Include timestamps")
    diarize_speakers: bool = Field(default=False, description="Identify speakers")


class EmailIngestRequest(BaseModel):
    include_attachments: bool = Field(default=True, description="Process attachments")


class GenerateInboxRequest(BaseModel):
    purpose: str = Field(default="default", description="Inbox purpose label")


# =============================================================================
# FILE INGESTION ENDPOINTS
# =============================================================================

@router.post("/upload")
@limiter.limit(RATE_LIMIT_STRICT)
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    auto_ocr: bool = Form(default=True),
    generate_preview: bool = Form(default=True),
    tags: str = Form(default=""),
    collection: str = Form(default=""),
):
    """
    Upload and ingest a file with auto-detection.

    Returns:
        IngestionResult with document details
    """
    try:
        content = await file.read()
        if len(content) > MAX_SINGLE_FILE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds maximum size of {MAX_SINGLE_FILE_BYTES // (1024*1024)} MB",
            )
        if len(content) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty",
            )

        metadata = {}
        if tags:
            metadata["tags"] = [t.strip() for t in tags.split(",") if t.strip()]
        if collection:
            metadata["collection"] = collection

        result = await ingestion_service.ingest_file(
            filename=file.filename or "upload",
            content=content,
            metadata=metadata,
            auto_ocr=auto_ocr,
            generate_preview=generate_preview,
        )
        return result.model_dump()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/upload/bulk")
@limiter.limit(RATE_LIMIT_STRICT)
async def upload_bulk(
    request: Request,
    files: List[UploadFile] = File(...),
    tags: str = Form(default=""),
    collection: str = Form(default=""),
):
    """
    Upload multiple files at once.

    Returns:
        List of IngestionResults
    """
    results = []
    errors = []

    metadata = {}
    if tags:
        metadata["tags"] = [t.strip() for t in tags.split(",")]
    if collection:
        metadata["collection"] = collection

    for file in files:
        try:
            content = await file.read()
            result = await ingestion_service.ingest_file(
                filename=file.filename or "upload",
                content=content,
                metadata=metadata,
            )
            results.append(result.model_dump())
        except Exception as e:
            errors.append({"filename": file.filename, "error": str(e)})

    return {
        "total": len(files),
        "successful": len(results),
        "failed": len(errors),
        "results": results,
        "errors": errors,
    }


@router.post("/upload/zip")
@limiter.limit(RATE_LIMIT_STRICT)
async def upload_zip(
    request: Request,
    file: UploadFile = File(...),
    preserve_structure: bool = Form(default=True),
    flatten: bool = Form(default=False),
):
    """
    Upload and extract a ZIP archive.

    Returns:
        BulkIngestionResult with all extracted documents
    """
    try:
        content = await file.read()
        result = await ingestion_service.ingest_zip_archive(
            filename=file.filename or "archive.zip",
            content=content,
            preserve_structure=preserve_structure,
            flatten=flatten,
        )
        return result.model_dump()
    except Exception as e:
        logger.error(f"ZIP upload failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/url")
async def ingest_from_url(request: IngestUrlRequest):
    """
    Download and ingest a file from a URL.

    Returns:
        IngestionResult with document details
    """
    try:
        result = await ingestion_service.ingest_from_url(
            url=request.url,
            filename=request.filename,
        )
        return result.model_dump()
    except Exception as e:
        logger.error(f"URL ingestion failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/structured")
async def ingest_structured_data(request: IngestStructuredDataRequest):
    """
    Import structured data (JSON/XML/YAML) as an editable table.

    Returns:
        StructuredDataImport with table details
    """
    try:
        result = await ingestion_service.import_structured_data(
            filename=request.filename,
            content=request.content.encode("utf-8"),
            format_hint=request.format_hint,
        )
        return result.model_dump()
    except Exception as e:
        logger.error(f"Structured data import failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# =============================================================================
# WEB CLIPPER ENDPOINTS
# =============================================================================

@router.post("/clip/url")
async def clip_web_page(request: ClipUrlRequest):
    """
    Clip content from a web page.

    Returns:
        ClippedContent with extracted content
    """
    try:
        clipped = await web_clipper_service.clip_url(
            url=request.url,
            include_images=request.include_images,
            clean_content=request.clean_content,
        )

        # Save as document
        doc_id = await web_clipper_service.save_as_document(
            clipped=clipped,
            format=request.output_format,
        )

        result = clipped.model_dump()
        result["document_id"] = doc_id
        return result
    except Exception as e:
        logger.error(f"Web clip failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/clip/selection")
async def clip_selection(request: ClipSelectionRequest):
    """
    Clip a user-selected portion of a page.

    Returns:
        ClippedContent with selected content
    """
    try:
        clipped = await web_clipper_service.clip_selection(
            url=request.url,
            selected_html=request.selected_html,
            page_title=request.page_title,
        )

        doc_id = await web_clipper_service.save_as_document(clipped)

        result = clipped.model_dump()
        result["document_id"] = doc_id
        return result
    except Exception as e:
        logger.error(f"Selection clip failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# =============================================================================
# FOLDER WATCHER ENDPOINTS
# =============================================================================

@router.post("/watchers")
async def create_folder_watcher(request: CreateWatcherRequest):
    """
    Create a new folder watcher.

    Returns:
        WatcherStatus
    """
    import hashlib
    from datetime import datetime, timezone

    watcher_id = hashlib.sha256(f"{request.path}:{datetime.now(timezone.utc).isoformat()}".encode()).hexdigest()[:12]

    config = WatcherConfig(
        watcher_id=watcher_id,
        path=request.path,
        recursive=request.recursive,
        patterns=request.patterns,
        ignore_patterns=request.ignore_patterns,
        auto_import=request.auto_import,
        delete_after_import=request.delete_after_import,
        target_collection=request.target_collection,
        tags=request.tags,
    )

    try:
        watcher_status = await folder_watcher_service.create_watcher(config)
        return watcher_status.model_dump()
    except Exception as e:
        logger.error(f"Failed to create watcher: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/watchers")
async def list_folder_watchers():
    """
    List all folder watchers.

    Returns:
        List of WatcherStatus
    """
    watchers = folder_watcher_service.list_watchers()
    return [w.model_dump() for w in watchers]


@router.get("/watchers/{watcher_id}")
async def get_watcher_status(watcher_id: str):
    """
    Get status of a folder watcher.

    Returns:
        WatcherStatus
    """
    try:
        watcher_info = folder_watcher_service.get_status(watcher_id)
        return watcher_info.model_dump()
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/watchers/{watcher_id}/start")
async def start_watcher(watcher_id: str):
    """Start a folder watcher."""
    try:
        success = await folder_watcher_service.start_watcher(watcher_id)
        return {"success": success}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/watchers/{watcher_id}/stop")
async def stop_watcher(watcher_id: str):
    """Stop a folder watcher."""
    success = await folder_watcher_service.stop_watcher(watcher_id)
    return {"success": success}


@router.post("/watchers/{watcher_id}/scan")
async def scan_watched_folder(watcher_id: str):
    """
    Manually scan a watched folder for existing files.

    Returns:
        List of FileEvents
    """
    try:
        events = await folder_watcher_service.scan_folder(watcher_id)
        return [e.model_dump() for e in events]
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/watchers/{watcher_id}")
async def delete_watcher(watcher_id: str):
    """Delete a folder watcher."""
    success = await folder_watcher_service.delete_watcher(watcher_id)
    return {"success": success}


# =============================================================================
# TRANSCRIPTION ENDPOINTS
# =============================================================================

@router.post("/transcribe")
@limiter.limit(RATE_LIMIT_STRICT)
async def transcribe_file(
    request: Request,
    file: UploadFile = File(...),
    language: str = Form(default="auto"),
    include_timestamps: bool = Form(default=True),
    diarize_speakers: bool = Form(default=False),
    output_format: str = Form(default="html"),
):
    """
    Transcribe an audio or video file.

    Returns:
        TranscriptionResult with full transcript
    """
    try:
        content = await file.read()

        lang = TranscriptionLanguage(language) if language in [l.value for l in TranscriptionLanguage] else TranscriptionLanguage.AUTO

        result = await transcription_service.transcribe_file(
            filename=file.filename or "recording",
            content=content,
            language=lang,
            include_timestamps=include_timestamps,
            diarize_speakers=diarize_speakers,
        )

        # Create document
        doc_id = await transcription_service.create_document_from_transcription(
            result=result,
            format=output_format,
            include_timestamps=include_timestamps,
        )

        response = result.model_dump()
        response["document_id"] = doc_id
        return response
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/transcribe/voice-memo")
async def transcribe_voice_memo(
    file: UploadFile = File(...),
    extract_action_items: bool = Form(default=True),
    extract_key_points: bool = Form(default=True),
):
    """
    Transcribe a voice memo with intelligent extraction.

    Returns:
        VoiceMemoResult with transcript and extracted items
    """
    try:
        content = await file.read()

        result = await transcription_service.transcribe_voice_memo(
            filename=file.filename or "voice_memo",
            content=content,
            extract_action_items=extract_action_items,
            extract_key_points=extract_key_points,
        )
        return result.model_dump()
    except Exception as e:
        logger.error(f"Voice memo transcription failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# =============================================================================
# EMAIL INGESTION ENDPOINTS
# =============================================================================

@router.post("/email/inbox")
async def generate_inbox_address(request: GenerateInboxRequest, user_id: str = "default"):
    """
    Generate a unique email inbox address for forwarding.

    Returns:
        Email address for forwarding
    """
    address = email_ingestion_service.generate_inbox_address(
        user_id=user_id,
        purpose=request.purpose,
    )
    return {"inbox_address": address}


@router.post("/email/ingest")
async def ingest_email(
    file: UploadFile = File(...),
    include_attachments: bool = Form(default=True),
):
    """
    Ingest a raw email file (.eml).

    Returns:
        EmailDocumentResult with created document
    """
    try:
        content = await file.read()

        result = await email_ingestion_service.convert_email_to_document(
            raw_email=content,
            include_attachments=include_attachments,
        )
        return result.model_dump()
    except Exception as e:
        logger.error(f"Email ingestion failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/email/parse")
async def parse_email(
    file: UploadFile = File(...),
    extract_action_items: bool = Form(default=True),
):
    """
    Parse an email and extract structured data.

    Returns:
        Parsed email with action items and links
    """
    try:
        content = await file.read()

        result = await email_ingestion_service.parse_incoming_email(
            raw_email=content,
            extract_action_items=extract_action_items,
        )
        return result
    except Exception as e:
        logger.error(f"Email parsing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# =============================================================================
# UTILITY ENDPOINTS
# =============================================================================

@router.post("/detect-type")
async def detect_file_type(file: UploadFile = File(...)):
    """
    Detect the type of an uploaded file.

    Returns:
        Detected file type and metadata
    """
    content = await file.read()
    file_type = ingestion_service.detect_file_type(
        filename=file.filename or "unknown",
        content=content,
    )
    return {
        "filename": file.filename,
        "detected_type": file_type.value,
        "size_bytes": len(content),
    }


@router.get("/supported-types")
async def list_supported_types():
    """
    List all supported file types for ingestion.

    Returns:
        List of supported file types
    """
    from backend.app.services.ingestion.service import FileType

    return {
        "file_types": [t.value for t in FileType if t != FileType.UNKNOWN],
        "transcription_languages": [l.value for l in TranscriptionLanguage],
    }
