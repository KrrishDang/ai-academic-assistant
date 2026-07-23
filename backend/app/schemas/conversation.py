"""Pydantic request and response schemas for conversations and messages."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ConversationCreateRequest(BaseModel):
    """Payload to create a new chat conversation."""

    document_id: Optional[uuid.UUID] = None
    title: str = Field(default="New Chat", min_length=1, max_length=255)


class ConversationRenameRequest(BaseModel):
    """Payload to rename an existing conversation."""

    title: str = Field(..., min_length=1, max_length=255)


class ConversationResponse(BaseModel):
    """Details of a chat conversation."""

    id: uuid.UUID
    document_id: Optional[uuid.UUID]
    title: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    """Details of a single message within a conversation."""

    id: uuid.UUID
    conversation_id: uuid.UUID
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatMessageRequest(BaseModel):
    """Payload for submitting a chat prompt to an active conversation."""

    message: str = Field(..., min_length=1)
    model: Optional[str] = None
    temperature: Optional[float] = None
