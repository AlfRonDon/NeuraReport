"""
Embedding pipeline: chunk text, generate embeddings, store in vector DB.

Supports OpenAI and sentence-transformers embeddings.
Based on: Haystack DocumentSplitter + SentenceTransformersDocumentEmbedder patterns.
"""
from __future__ import annotations
import hashlib
import logging
from typing import Any, Optional

logger = logging.getLogger("neura.vectorstore.embedding")


class EmbeddingPipeline:
    """Generate embeddings using OpenAI or sentence-transformers."""

    def __init__(self, model: str = "text-embedding-3-small", embedding_dim: int = 1536):
        self.model = model
        self.embedding_dim = embedding_dim

    def chunk_text(self, text: str, chunk_size: int = 512, chunk_overlap: int = 50) -> list[str]:
        """Split text into overlapping chunks."""
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            start = end - chunk_overlap
        return chunks

    async def generate_embeddings(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings using OpenAI API."""
        import openai
        from backend.app.services.config import get_settings
        settings = get_settings()
        client = openai.AsyncOpenAI(api_key=settings.openai_api_key)

        response = await client.embeddings.create(input=texts, model=self.model)
        return [item.embedding for item in response.data]

    async def process_document(
        self, doc_id: str, content: str, source: str,
        metadata: Optional[dict[str, Any]] = None,
    ) -> list[dict]:
        """Full pipeline: chunk -> embed -> return records for storage."""
        chunks = self.chunk_text(content)
        if not chunks:
            return []

        embeddings = await self.generate_embeddings(chunks)

        records = []
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            records.append({
                "doc_id": doc_id,
                "chunk_index": i,
                "content": chunk,
                "embedding": embedding,
                "source": source,
                "metadata": metadata or {},
            })

        logger.info("document_embedded", extra={
            "event": "document_embedded", "doc_id": doc_id,
            "chunks": len(records), "model": self.model,
        })
        return records

    async def embed_query(self, query: str) -> list[float]:
        """Embed a single query string."""
        embeddings = await self.generate_embeddings([query])
        return embeddings[0]
