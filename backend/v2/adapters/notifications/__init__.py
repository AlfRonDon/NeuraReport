"""
Notification adapters - Sending notifications.
"""

from .base import Notifier
from .email import SMTPNotifier

__all__ = [
    "Notifier",
    "SMTPNotifier",
    "EmailNotifier",
]

# Alias
EmailNotifier = SMTPNotifier
