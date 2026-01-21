"""Cross-Database Federation domain module."""
from .schemas import (
    VirtualSchema,
    JoinSuggestion,
    FederatedQueryRequest,
)
from .service import FederationService

__all__ = [
    "VirtualSchema",
    "JoinSuggestion",
    "FederatedQueryRequest",
    "FederationService",
]
