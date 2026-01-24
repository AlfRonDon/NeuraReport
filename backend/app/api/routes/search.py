"""
Search & Discovery API Routes
Endpoints for full-text, semantic, and advanced search.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from backend.app.services.search import search_service
from backend.app.services.search.service import SearchType, SearchFilter

logger = logging.getLogger(__name__)
router = APIRouter()


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

class SearchRequest(BaseModel):
    query: str = Field(..., description="Search query")
    search_type: str = Field(default="fulltext", description="Search type")
    filters: List[Dict[str, Any]] = Field(default_factory=list, description="Filters")
    facet_fields: List[str] = Field(default_factory=list, description="Facet fields")
    page: int = Field(default=1, ge=1, description="Page number")
    page_size: int = Field(default=20, ge=1, le=100, description="Results per page")
    highlight: bool = Field(default=True, description="Highlight matches")
    typo_tolerance: bool = Field(default=True, description="Enable typo tolerance")


class IndexDocumentRequest(BaseModel):
    document_id: str = Field(..., description="Document ID")
    title: str = Field(..., description="Document title")
    content: str = Field(..., description="Document content")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Metadata")


class SearchReplaceRequest(BaseModel):
    search_query: str = Field(..., description="Text to search")
    replace_with: str = Field(..., description="Replacement text")
    document_ids: Optional[List[str]] = Field(default=None, description="Limit to documents")
    dry_run: bool = Field(default=True, description="Preview only")


class SaveSearchRequest(BaseModel):
    name: str = Field(..., description="Search name")
    query: str = Field(..., description="Search query")
    filters: List[Dict[str, Any]] = Field(default_factory=list, description="Filters")
    notify_on_new: bool = Field(default=False, description="Notify on new results")


# =============================================================================
# SEARCH ENDPOINTS
# =============================================================================

@router.post("/search")
async def search(request: SearchRequest):
    """
    Perform a search with various options.

    Returns:
        SearchResponse with results
    """
    try:
        search_type = SearchType(request.search_type) if request.search_type in [t.value for t in SearchType] else SearchType.FULLTEXT
        filters = [SearchFilter(**f) for f in request.filters]

        result = await search_service.search(
            query=request.query,
            search_type=search_type,
            filters=filters,
            facet_fields=request.facet_fields,
            page=request.page,
            page_size=request.page_size,
            highlight=request.highlight,
            typo_tolerance=request.typo_tolerance,
        )
        return result.model_dump()
    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/search/semantic")
async def semantic_search(request: SearchRequest):
    """
    Perform semantic similarity search.

    Returns:
        SearchResponse with semantically similar results
    """
    request.search_type = "semantic"
    return await search(request)


@router.post("/search/regex")
async def regex_search(request: SearchRequest):
    """
    Perform regex pattern search.

    Returns:
        SearchResponse with regex matches
    """
    request.search_type = "regex"
    return await search(request)


@router.post("/search/boolean")
async def boolean_search(request: SearchRequest):
    """
    Perform boolean search with AND, OR, NOT operators.

    Returns:
        SearchResponse with boolean match results
    """
    request.search_type = "boolean"
    return await search(request)


@router.post("/search/replace")
async def search_and_replace(request: SearchReplaceRequest):
    """
    Search and replace across documents.

    Returns:
        Replacement results
    """
    try:
        result = await search_service.search_and_replace(
            search_query=request.search_query,
            replace_with=request.replace_with,
            document_ids=request.document_ids,
            dry_run=request.dry_run,
        )
        return result
    except Exception as e:
        logger.error(f"Search and replace failed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/documents/{document_id}/similar")
async def find_similar_documents(document_id: str, limit: int = 10):
    """
    Find documents similar to the given document.

    Returns:
        List of similar documents
    """
    try:
        results = await search_service.find_similar(document_id, limit)
        return [r.model_dump() for r in results]
    except Exception as e:
        logger.error(f"Find similar failed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# =============================================================================
# INDEXING ENDPOINTS
# =============================================================================

@router.post("/index")
async def index_document(request: IndexDocumentRequest):
    """
    Index a document for searching.

    Returns:
        Success status
    """
    try:
        success = await search_service.index_document(
            document_id=request.document_id,
            title=request.title,
            content=request.content,
            metadata=request.metadata,
        )
        return {"success": success}
    except Exception as e:
        logger.error(f"Index failed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.delete("/index/{document_id}")
async def remove_from_index(document_id: str):
    """
    Remove a document from the search index.

    Returns:
        Success status
    """
    success = await search_service.remove_from_index(document_id)
    return {"success": success}


# =============================================================================
# SAVED SEARCHES
# =============================================================================

@router.post("/saved-searches")
async def save_search(request: SaveSearchRequest):
    """
    Save a search for later use.

    Returns:
        SavedSearch configuration
    """
    try:
        filters = [SearchFilter(**f) for f in request.filters]
        result = await search_service.save_search(
            name=request.name,
            query=request.query,
            filters=filters,
            notify_on_new=request.notify_on_new,
        )
        return result.model_dump()
    except Exception as e:
        logger.error(f"Save search failed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/saved-searches")
async def list_saved_searches():
    """List all saved searches."""
    searches = search_service.list_saved_searches()
    return [s.model_dump() for s in searches]


@router.post("/saved-searches/{search_id}/run")
async def run_saved_search(search_id: str):
    """Run a saved search."""
    try:
        result = await search_service.run_saved_search(search_id)
        return result.model_dump()
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/saved-searches/{search_id}")
async def delete_saved_search(search_id: str):
    """Delete a saved search."""
    success = search_service.delete_saved_search(search_id)
    return {"success": success}


# =============================================================================
# ANALYTICS
# =============================================================================

@router.get("/analytics")
async def get_search_analytics():
    """Get search analytics."""
    analytics = await search_service.get_search_analytics()
    return analytics.model_dump()
