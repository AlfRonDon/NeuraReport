"""
Email notifier using SMTP.
"""

from __future__ import annotations

import asyncio
import logging
import os
import smtplib
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import List, Optional

from .base import Notifier
from ...core import Result, Ok, Err, DomainError

logger = logging.getLogger("neura.adapters.notifications.email")


class SMTPNotifier(Notifier):
    """
    Send emails via SMTP.

    Configuration via environment variables:
    - SMTP_HOST: SMTP server hostname
    - SMTP_PORT: SMTP server port (default: 587)
    - SMTP_USER: SMTP username
    - SMTP_PASSWORD: SMTP password
    - SMTP_FROM: Default sender address
    - SMTP_USE_TLS: Use TLS (default: true)
    """

    def __init__(
        self,
        host: Optional[str] = None,
        port: Optional[int] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
        from_address: Optional[str] = None,
        use_tls: bool = True,
    ):
        self._host = host or os.getenv("SMTP_HOST", "localhost")
        self._port = port or int(os.getenv("SMTP_PORT", "587"))
        self._username = username or os.getenv("SMTP_USER")
        self._password = password or os.getenv("SMTP_PASSWORD")
        self._from_address = from_address or os.getenv("SMTP_FROM", "noreply@example.com")
        self._use_tls = use_tls if use_tls is not None else os.getenv("SMTP_USE_TLS", "true").lower() == "true"

    async def send(
        self,
        recipients: List[str],
        subject: str,
        message: str,
        attachments: Optional[List[Path]] = None,
        **kwargs,
    ) -> Result[bool, DomainError]:
        """Send an email."""
        if not recipients:
            return Err(DomainError(
                code="no_recipients",
                message="No recipients specified",
            ))

        # Build the email
        msg = MIMEMultipart()
        msg["From"] = kwargs.get("from_address", self._from_address)
        msg["To"] = ", ".join(recipients)
        msg["Subject"] = subject

        # Add body
        content_type = kwargs.get("content_type", "plain")
        msg.attach(MIMEText(message, content_type))

        # Add attachments
        if attachments:
            for file_path in attachments:
                if not file_path.exists():
                    logger.warning(f"Attachment not found: {file_path}")
                    continue

                try:
                    with open(file_path, "rb") as f:
                        part = MIMEApplication(f.read(), Name=file_path.name)
                    part["Content-Disposition"] = f'attachment; filename="{file_path.name}"'
                    msg.attach(part)
                except Exception as e:
                    logger.warning(f"Failed to attach {file_path}: {e}")

        # Send the email
        try:
            await asyncio.to_thread(self._send_sync, msg, recipients)
            logger.info(f"Email sent to {recipients}")
            return Ok(True)
        except Exception as e:
            return Err(DomainError(
                code="send_failed",
                message=f"Failed to send email: {e}",
                cause=e,
            ))

    def _send_sync(self, msg: MIMEMultipart, recipients: List[str]) -> None:
        """Synchronous email send."""
        if self._use_tls:
            server = smtplib.SMTP(self._host, self._port)
            server.starttls()
        else:
            server = smtplib.SMTP(self._host, self._port)

        try:
            if self._username and self._password:
                server.login(self._username, self._password)
            server.sendmail(msg["From"], recipients, msg.as_string())
        finally:
            server.quit()
