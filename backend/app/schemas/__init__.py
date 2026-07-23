"""Pydantic request and response schemas."""

from app.schemas.document import DocumentUploadResponse, DocumentResponse, DocumentRenameRequest
from app.schemas.conversation import (
    ConversationCreateRequest,
    ConversationRenameRequest,
    ConversationResponse,
    MessageResponse,
    ChatMessageRequest,
)
from app.schemas.dashboard import DashboardStatsResponse, ActivityResponse
from app.schemas.search import SearchResultsResponse, MessageSearchResponse

__all__ = [
    "DocumentUploadResponse",
    "DocumentResponse",
    "DocumentRenameRequest",
    "ConversationCreateRequest",
    "ConversationRenameRequest",
    "ConversationResponse",
    "MessageResponse",
    "ChatMessageRequest",
    "DashboardStatsResponse",
    "ActivityResponse",
    "SearchResultsResponse",
    "MessageSearchResponse",
]
