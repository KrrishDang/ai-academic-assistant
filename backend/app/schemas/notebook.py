"""Pydantic request and response schemas for notebooks and sources."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, StringConstraints
from typing_extensions import Annotated

from app.schemas.conversation import ConversationResponse


class SourceResponse(BaseModel):
    """Details of a source entity attached to a notebook. Note: storage_key is explicitly excluded."""

    id: uuid.UUID
    notebook_id: uuid.UUID
    source_type: str
    original_filename: Optional[str] = None
    display_title: str
    mime_type: Optional[str] = None
    file_size_bytes: Optional[int] = None
    content_hash: Optional[str] = None
    processing_status: str
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotebookCreateRequest(BaseModel):
    """Payload to create a new notebook."""

    title: Annotated[str, StringConstraints(min_length=1, max_length=255, strip_whitespace=True)]
    description: Optional[str] = None


class NotebookUpdateRequest(BaseModel):
    """Payload to update an existing notebook."""

    title: Optional[Annotated[str, StringConstraints(min_length=1, max_length=255, strip_whitespace=True)]] = None
    description: Optional[str] = None


class NotebookResponse(BaseModel):
    """Base response schema for a notebook."""

    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotebookSummaryResponse(BaseModel):
    """Summary response for notebook listing containing counts."""

    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    source_count: int
    conversation_count: int

    model_config = ConfigDict(from_attributes=True)


class NotebookDetailResponse(BaseModel):
    """Full detailed notebook response including sources and conversations."""

    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    sources: list[SourceResponse] = Field(default_factory=list)
    conversations: list[ConversationResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
