"""Document ingestion tasks."""
import dramatiq
import logging

logger = logging.getLogger("neura.worker.ingestion")

@dramatiq.actor(
    queue_name="ingestion",
    max_retries=2,
    time_limit=120_000,
)
def ingest_document(doc_id: str, source_type: str, source_url: str, **kwargs):
    """Ingest a document from an external source."""
    logger.info("ingestion_started", extra={"event": "ingestion_started", "doc_id": doc_id, "source_type": source_type})
    # Integration point for existing ingestion services
    from backend.app.services.ingestion.service import IngestService
    service = IngestService()
    result = service.ingest(doc_id=doc_id, source_type=source_type, source_url=source_url, **kwargs)
    logger.info("ingestion_completed", extra={"event": "ingestion_completed", "doc_id": doc_id})
    return result
