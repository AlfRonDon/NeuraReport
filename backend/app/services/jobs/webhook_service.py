"""
Webhook notification service for job completion events.

Sends HMAC-signed HTTP callbacks to configured webhook URLs when jobs complete.
Implements retry with exponential backoff for delivery reliability.
"""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, Optional

logger = logging.getLogger("neura.jobs.webhook")

# Try to import httpx, fall back gracefully if not available
try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False
    logger.warning("httpx not installed, webhook delivery disabled")


@dataclass
class WebhookPayload:
    """Payload structure for webhook notifications."""

    job_id: str
    status: str
    template_id: Optional[str]
    template_name: Optional[str]
    artifacts: Dict[str, Any]
    error: Optional[str]
    completed_at: Optional[str]
    retry_count: int
    event_type: str = "job.completed"

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "event": self.event_type,
            "job_id": self.job_id,
            "status": self.status,
            "template_id": self.template_id,
            "template_name": self.template_name,
            "artifacts": self.artifacts,
            "error": self.error,
            "completed_at": self.completed_at,
            "retry_count": self.retry_count,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


@dataclass
class WebhookResult:
    """Result of webhook delivery attempt."""

    success: bool
    status_code: Optional[int]
    attempts: int
    error: Optional[str]
    response_body: Optional[str] = None


class WebhookService:
    """
    Service for delivering webhook notifications.

    Features:
    - HMAC-SHA256 signature for payload verification
    - Retry with exponential backoff
    - Configurable timeout and retry settings
    """

    # Default configuration
    DEFAULT_TIMEOUT_SECONDS = 10
    DEFAULT_MAX_RETRIES = 3
    DEFAULT_INITIAL_BACKOFF_SECONDS = 1

    # Environment-based secret for signing (can be overridden per-job)
    DEFAULT_WEBHOOK_SECRET = os.getenv("NEURA_WEBHOOK_SECRET", "neura-default-webhook-secret")

    def __init__(
        self,
        timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS,
        max_retries: int = DEFAULT_MAX_RETRIES,
        initial_backoff_seconds: float = DEFAULT_INITIAL_BACKOFF_SECONDS,
    ):
        self.timeout_seconds = timeout_seconds
        self.max_retries = max_retries
        self.initial_backoff_seconds = initial_backoff_seconds

    def compute_signature(self, payload: Dict[str, Any], secret: str) -> str:
        """
        Compute HMAC-SHA256 signature for webhook payload.

        Args:
            payload: The webhook payload dictionary
            secret: The signing secret

        Returns:
            Hex-encoded HMAC-SHA256 signature
        """
        payload_bytes = json.dumps(payload, sort_keys=True, default=str).encode("utf-8")
        signature = hmac.new(
            secret.encode("utf-8"),
            payload_bytes,
            hashlib.sha256
        ).hexdigest()
        return signature

    def build_headers(self, payload: Dict[str, Any], secret: str) -> Dict[str, str]:
        """
        Build HTTP headers for webhook request.

        Args:
            payload: The webhook payload dictionary
            secret: The signing secret

        Returns:
            Dictionary of HTTP headers
        """
        signature = self.compute_signature(payload, secret)
        return {
            "Content-Type": "application/json",
            "User-Agent": "NeuraReport-Webhook/1.0",
            "X-NeuraReport-Event": "job.completed",
            "X-NeuraReport-Signature": f"sha256={signature}",
            "X-NeuraReport-Delivery": datetime.now(timezone.utc).isoformat(),
        }

    async def deliver(
        self,
        webhook_url: str,
        payload: WebhookPayload,
        secret: Optional[str] = None,
    ) -> WebhookResult:
        """
        Deliver webhook notification with retry.

        Args:
            webhook_url: The URL to POST the webhook to
            payload: The webhook payload
            secret: Optional signing secret (uses default if not provided)

        Returns:
            WebhookResult with delivery status
        """
        if not HTTPX_AVAILABLE:
            logger.warning("webhook_delivery_skipped", extra={"reason": "httpx not installed"})
            return WebhookResult(
                success=False,
                status_code=None,
                attempts=0,
                error="httpx library not installed",
            )

        if not webhook_url:
            return WebhookResult(
                success=False,
                status_code=None,
                attempts=0,
                error="No webhook URL configured",
            )

        secret = secret or self.DEFAULT_WEBHOOK_SECRET
        payload_dict = payload.to_dict()
        headers = self.build_headers(payload_dict, secret)

        last_error: Optional[str] = None
        last_status: Optional[int] = None

        for attempt in range(self.max_retries):
            try:
                async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                    response = await client.post(
                        webhook_url,
                        json=payload_dict,
                        headers=headers,
                    )

                last_status = response.status_code

                if response.status_code < 400:
                    logger.info(
                        "webhook_delivery_success",
                        extra={
                            "job_id": payload.job_id,
                            "webhook_url": webhook_url[:100],
                            "status_code": response.status_code,
                            "attempt": attempt + 1,
                        }
                    )
                    return WebhookResult(
                        success=True,
                        status_code=response.status_code,
                        attempts=attempt + 1,
                        error=None,
                        response_body=response.text[:500] if response.text else None,
                    )

                # Server error (5xx) - retry
                if response.status_code >= 500:
                    last_error = f"Server error: {response.status_code}"
                    logger.warning(
                        "webhook_delivery_server_error",
                        extra={
                            "job_id": payload.job_id,
                            "status_code": response.status_code,
                            "attempt": attempt + 1,
                        }
                    )
                else:
                    # Client error (4xx) - don't retry
                    last_error = f"Client error: {response.status_code}"
                    logger.warning(
                        "webhook_delivery_client_error",
                        extra={
                            "job_id": payload.job_id,
                            "status_code": response.status_code,
                            "response": response.text[:200] if response.text else None,
                        }
                    )
                    return WebhookResult(
                        success=False,
                        status_code=response.status_code,
                        attempts=attempt + 1,
                        error=last_error,
                        response_body=response.text[:500] if response.text else None,
                    )

            except httpx.TimeoutException as e:
                last_error = f"Timeout: {str(e)}"
                logger.warning(
                    "webhook_delivery_timeout",
                    extra={
                        "job_id": payload.job_id,
                        "attempt": attempt + 1,
                        "error": str(e),
                    }
                )

            except httpx.RequestError as e:
                last_error = f"Request error: {str(e)}"
                logger.warning(
                    "webhook_delivery_error",
                    extra={
                        "job_id": payload.job_id,
                        "attempt": attempt + 1,
                        "error": str(e),
                    }
                )

            except Exception as e:
                last_error = f"Unexpected error: {str(e)}"
                logger.exception(
                    "webhook_delivery_unexpected_error",
                    extra={
                        "job_id": payload.job_id,
                        "attempt": attempt + 1,
                    }
                )

            # Calculate backoff for next retry
            if attempt < self.max_retries - 1:
                backoff = self.initial_backoff_seconds * (2 ** attempt)
                await asyncio.sleep(backoff)

        # All retries exhausted
        logger.error(
            "webhook_delivery_failed",
            extra={
                "job_id": payload.job_id,
                "webhook_url": webhook_url[:100],
                "attempts": self.max_retries,
                "last_error": last_error,
            }
        )

        return WebhookResult(
            success=False,
            status_code=last_status,
            attempts=self.max_retries,
            error=last_error,
        )

    def deliver_sync(
        self,
        webhook_url: str,
        payload: WebhookPayload,
        secret: Optional[str] = None,
    ) -> WebhookResult:
        """
        Synchronous wrapper for webhook delivery.

        Args:
            webhook_url: The URL to POST the webhook to
            payload: The webhook payload
            secret: Optional signing secret

        Returns:
            WebhookResult with delivery status
        """
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        return loop.run_until_complete(self.deliver(webhook_url, payload, secret))


# Singleton instance
_webhook_service: Optional[WebhookService] = None


def get_webhook_service() -> WebhookService:
    """Get the singleton webhook service instance."""
    global _webhook_service
    if _webhook_service is None:
        _webhook_service = WebhookService()
    return _webhook_service


async def send_job_webhook(
    job: Dict[str, Any],
    webhook_url: Optional[str] = None,
    webhook_secret: Optional[str] = None,
) -> WebhookResult:
    """
    Convenience function to send webhook notification for a job.

    Args:
        job: Job record dictionary (from StateStore)
        webhook_url: Optional URL override (uses job's webhook_url if not provided)
        webhook_secret: Optional secret override (uses job's webhook_secret if not provided)

    Returns:
        WebhookResult with delivery status
    """
    url = webhook_url or job.get("webhookUrl") or job.get("webhook_url")
    secret = webhook_secret or job.get("webhook_secret")

    if not url:
        return WebhookResult(
            success=True,  # No webhook configured is not an error
            status_code=None,
            attempts=0,
            error=None,
        )

    payload = WebhookPayload(
        job_id=job.get("id") or job.get("job_id") or "",
        status=job.get("status") or "",
        template_id=job.get("templateId") or job.get("template_id"),
        template_name=job.get("templateName") or job.get("template_name"),
        artifacts=job.get("result", {}).get("artifacts", {}),
        error=job.get("error"),
        completed_at=job.get("finishedAt") or job.get("finished_at"),
        retry_count=job.get("retryCount") or job.get("retry_count") or 0,
    )

    service = get_webhook_service()
    return await service.deliver(url, payload, secret)


def send_job_webhook_sync(
    job: Dict[str, Any],
    webhook_url: Optional[str] = None,
    webhook_secret: Optional[str] = None,
) -> WebhookResult:
    """
    Synchronous version of send_job_webhook.

    Args:
        job: Job record dictionary (from StateStore)
        webhook_url: Optional URL override
        webhook_secret: Optional secret override

    Returns:
        WebhookResult with delivery status
    """
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    return loop.run_until_complete(send_job_webhook(job, webhook_url, webhook_secret))
