"""Document upload and generation API schemas."""

import uuid
from datetime import datetime
from pydantic import BaseModel, Field, AliasChoices


class DocumentUploadResponse(BaseModel):
    """Content returned after a PDF upload is processed and stored."""

    id: uuid.UUID
    filename: str
    page_count: int = Field(ge=1)
    extracted_text: str = Field(min_length=1)


class DocumentResponse(BaseModel):
    """Details of a persistent document."""

    id: uuid.UUID
    filename: str = Field(..., validation_alias=AliasChoices("original_filename", "filename"))
    page_count: int
    file_size_bytes: int
    extracted_text: str
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentRenameRequest(BaseModel):
    """Payload to rename an uploaded document."""

    filename: str = Field(..., min_length=1, max_length=255)


class NotesGenerationRequest(BaseModel):
    """Text extracted from a document for notes generation."""

    extracted_text: str = Field(min_length=1, max_length=2_000_000)
