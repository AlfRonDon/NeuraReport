"""Knowledge Management API Routes.

REST API endpoints for document library and knowledge management.
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request

from backend.app.services.background_tasks import enqueue_background_job
import backend.app.services.state_access as state_access
from backend.app.schemas.knowledge.library import (
    AutoTagRequest,
    CollectionCreate,
    CollectionResponse,
    CollectionUpdate,
    DocumentType,
    FAQGenerateRequest,
    FAQResponse,
    KnowledgeGraphRequest,
    KnowledgeGraphResponse,
    LibraryDocumentCreate,
    LibraryDocumentResponse,
    LibraryDocumentUpdate,
    RelatedDocumentsRequest,
    RelatedDocumentsResponse,
    SearchRequest,
    SearchResponse,
    SemanticSearchRequest,
    TagCreate,
    TagResponse,
)
from backend.app.services.knowledge.service import knowledge_service

logger = logging.getLogger("neura.api.knowledge")

router = APIRouter(tags=["knowledge"])


# Document endpoints


@router.post("/documents", response_model=LibraryDocumentResponse)
async def add_document(request: LibraryDocumentCreate):
    """Add a document to the library."""
    return await knowledge_service.add_document(request)


@router.get("/documents", response_model=list[LibraryDocumentResponse])
async def list_documents(
    collection_id: Optional[str] = None,
    tags: Optional[str] = Query(None, description="Comma-separated tag names"),
    document_type: Optional[DocumentType] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """List documents with optional filtering."""
    tag_list = tags.split(",") if tags else None
    docs, total = await knowledge_service.list_documents(
        collection_id=collection_id,
        tags=tag_list,
        document_type=document_type,
        limit=limit,
        offset=offset,
    )
    return docs


@router.get("/documents/{doc_id}", response_model=LibraryDocumentResponse)
async def get_document(doc_id: str):
    """Get a document by ID."""
    doc = await knowledge_service.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.put("/documents/{doc_id}", response_model=LibraryDocumentResponse)
async def update_document(doc_id: str, request: LibraryDocumentUpdate):
    """Update a document."""
    doc = await knowledge_service.update_document(doc_id, request)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document from the library."""
    deleted = await knowledge_service.delete_document(doc_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"status": "deleted", "id": doc_id}


@router.post("/documents/{doc_id}/favorite")
async def toggle_favorite(doc_id: str):
    """Toggle favorite status for a document."""
    is_favorite = await knowledge_service.toggle_favorite(doc_id)
    return {"document_id": doc_id, "is_favorite": is_favorite}


# Collection endpoints


@router.post("/collections", response_model=CollectionResponse)
async def create_collection(request: CollectionCreate):
    """Create a new collection."""
    return await knowledge_service.create_collection(request)


@router.get("/collections", response_model=list[CollectionResponse])
async def list_collections():
    """List all collections."""
    return await knowledge_service.list_collections()


@router.get("/collections/{coll_id}", response_model=CollectionResponse)
async def get_collection(coll_id: str):
    """Get a collection by ID."""
    coll = await knowledge_service.get_collection(coll_id)
    if not coll:
        raise HTTPException(status_code=404, detail="Collection not found")
    return coll


@router.put("/collections/{coll_id}", response_model=CollectionResponse)
async def update_collection(coll_id: str, request: CollectionUpdate):
    """Update a collection."""
    coll = await knowledge_service.update_collection(coll_id, request)
    if not coll:
        raise HTTPException(status_code=404, detail="Collection not found")
    return coll


@router.delete("/collections/{coll_id}")
async def delete_collection(coll_id: str):
    """Delete a collection."""
    deleted = await knowledge_service.delete_collection(coll_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Collection not found")
    return {"status": "deleted", "id": coll_id}


# Tag endpoints


@router.post("/tags", response_model=TagResponse)
async def create_tag(request: TagCreate):
    """Create a new tag."""
    return await knowledge_service.create_tag(request)


@router.get("/tags", response_model=list[TagResponse])
async def list_tags():
    """List all tags."""
    return await knowledge_service.list_tags()


@router.delete("/tags/{tag_id}")
async def delete_tag(tag_id: str):
    """Delete a tag."""
    deleted = await knowledge_service.delete_tag(tag_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Tag not found")
    return {"status": "deleted", "id": tag_id}


# Search endpoints


@router.post("/search", response_model=SearchResponse)
async def search_documents(request: SearchRequest):
    """Full-text search across documents."""
    return await knowledge_service.search(
        query=request.query,
        document_types=request.document_types,
        tags=request.tags,
        collections=request.collections,
        limit=request.limit,
        offset=request.offset,
    )


@router.get("/search")
async def search_documents_get(
    query: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Full-text search (GET endpoint)."""
    return await knowledge_service.search(
        query=query,
        limit=limit,
        offset=offset,
    )


@router.post("/search/semantic", response_model=SearchResponse)
async def semantic_search(request: SemanticSearchRequest):
    """Semantic search using embeddings."""
    return await knowledge_service.semantic_search(
        query=request.query,
        document_ids=request.document_ids,
        top_k=request.top_k,
        threshold=request.threshold,
    )


# AI-powered endpoints


@router.post("/auto-tag")
async def auto_tag_document(request: AutoTagRequest):
    """Auto-suggest tags for a document."""
    return await knowledge_service.auto_tag(
        doc_id=request.document_id,
        max_tags=request.max_tags,
    )


@router.post("/related", response_model=RelatedDocumentsResponse)
async def find_related_documents(request: RelatedDocumentsRequest):
    """Find documents related to a given document."""
    return await knowledge_service.find_related(
        doc_id=request.document_id,
        limit=request.limit,
    )


@router.post("/knowledge-graph", response_model=KnowledgeGraphResponse)
async def build_knowledge_graph(request: KnowledgeGraphRequest):
    """Build a knowledge graph from documents."""
    return await knowledge_service.build_knowledge_graph(
        document_ids=request.document_ids,
        depth=request.depth,
    )


@router.post("/faq", response_model=FAQResponse)
async def generate_faq(request: FAQGenerateRequest):
    """Generate FAQ from documents."""
    return await knowledge_service.generate_faq(
        document_ids=request.document_ids,
        max_questions=request.max_questions,
    )
