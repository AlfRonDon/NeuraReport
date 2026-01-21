"""
Notifier interface.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path
from typing import List, Optional

from ...core import Result, DomainError


class Notifier(ABC):
    """Abstract interface for sending notifications."""

    @abstractmethod
    async def send(
        self,
        recipients: List[str],
        subject: str,
        message: str,
        attachments: Optional[List[Path]] = None,
        **kwargs,
    ) -> Result[bool, DomainError]:
        """
        Send a notification.

        Args:
            recipients: List of recipient addresses
            subject: Notification subject
            message: Notification body
            attachments: Optional file attachments
            **kwargs: Provider-specific options

        Returns:
            Ok(True) on success, Err on failure
        """
        pass
