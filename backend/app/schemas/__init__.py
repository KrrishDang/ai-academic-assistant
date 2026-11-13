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
from app.schemas.notebook import (
    SourceResponse,
    NotebookCreateRequest,
    NotebookUpdateRequest,
    NotebookResponse,
    NotebookSummaryResponse,
    NotebookDetailResponse,
)
from app.schemas.study_material import (
    StudyGuideGenerateRequest,
    FlashcardsGenerateRequest,
    ExamPaperGenerateRequest,
    FlashcardItem,
    FlashcardsContent,
    ExamQuestionItem,
    ExamPaperContent,
    StudyMaterialResponse,
    StudyMaterialSummaryResponse,
)

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
    "SourceResponse",
    "NotebookCreateRequest",
    "NotebookUpdateRequest",
    "NotebookResponse",
    "NotebookSummaryResponse",
    "NotebookDetailResponse",
    "StudyGuideGenerateRequest",
    "FlashcardsGenerateRequest",
    "ExamPaperGenerateRequest",
    "FlashcardItem",
    "FlashcardsContent",
    "ExamQuestionItem",
    "ExamPaperContent",
    "StudyMaterialResponse",
    "StudyMaterialSummaryResponse",
]
