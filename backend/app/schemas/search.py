"""Pydantic schemas for global search results."""

import uuid
from typing import List, Optional
from pydantic import BaseModel
from app.schemas.document import DocumentResponse
from app.schemas.conversation import ConversationResponse


class MessageSearchResponse(BaseModel):
    """Details of a matching message and its parent conversation context."""

    id: uuid.UUID
    conversation_id: uuid.UUID
    role: str
    content: str
    conversation_title: str


class SearchResultsResponse(BaseModel):
    """Summarized categories of matching entities for a search query."""

    documents: List[DocumentResponse]
    conversations: List[ConversationResponse]
    messages: List[MessageSearchResponse]
