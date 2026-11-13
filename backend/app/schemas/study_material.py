"""Pydantic request and response schemas for notebook study materials."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, Field


# ─── Generation Requests ──────────────────────────────────────────────────────

class StudyGuideGenerateRequest(BaseModel):
    """Configuration payload for generating comprehensive notebook study notes."""

    title: Optional[str] = Field(None, max_length=255)
    focus_topics: Optional[List[str]] = Field(None, description="Optional specific topics to focus on.")


class FlashcardsGenerateRequest(BaseModel):
    """Configuration payload for generating structured flashcards."""

    title: Optional[str] = Field(None, max_length=255)
    num_cards: int = Field(default=10, ge=1, le=50, description="Target number of flashcards to generate.")
    difficulty: str = Field(
        default="Mixed",
        pattern="^(Easy|Medium|Hard|Mixed)$",
        description="Target difficulty level for flashcards.",
    )


class ExamPaperGenerateRequest(BaseModel):
    """Configuration payload for generating an exam paper with 5-mark and 10-mark questions."""

    title: Optional[str] = Field(None, max_length=255)
    total_marks: int = Field(default=50, ge=5, le=100, description="Total paper marks (must be multiple of 5).")
    question_types: List[str] = Field(
        default_factory=lambda: ["five_mark", "ten_mark"],
        description="Supported question mark denominations: 'five_mark' (5) and/or 'ten_mark' (10).",
    )
    difficulty: str = Field(
        default="Mixed",
        pattern="^(Easy|Medium|Hard|Mixed)$",
        description="Target examination difficulty level.",
    )
    include_answer_key: bool = Field(
        default=True,
        description="Whether to generate model solutions and marking key points.",
    )


# ─── Structured Output Schemas (Validated JSON Content) ───────────────────────

class FlashcardItem(BaseModel):
    """Individual structured flashcard."""

    front: str = Field(..., description="Concept question, term, or prompt.")
    back: str = Field(..., description="Concise definition, explanation, or memorization response.")
    difficulty: str = Field(default="Medium")
    topic: Optional[str] = None
    source_reference: Optional[str] = None


class FlashcardsContent(BaseModel):
    """Complete structured flashcard collection."""

    flashcards: List[FlashcardItem] = Field(min_length=1)


class ExamQuestionItem(BaseModel):
    """Individual question inside an examination paper."""

    question_number: int = Field(..., ge=1)
    question_text: str = Field(...)
    marks: int = Field(..., ge=1)
    question_type: str = Field(...)
    difficulty: str = Field(default="Medium")
    model_answer: Optional[str] = None
    key_points: List[str] = Field(default_factory=list)
    source_reference: Optional[str] = None


class ExamPaperContent(BaseModel):
    """Complete examination paper structure."""

    title: str = Field(...)
    total_marks: int = Field(..., ge=1)
    instructions: List[str] = Field(default_factory=list)
    questions: List[ExamQuestionItem] = Field(min_length=1)


# ─── Study Material API Responses ─────────────────────────────────────────────

class StudyMaterialSummaryResponse(BaseModel):
    """Summary of a saved study material for listing views."""

    id: uuid.UUID
    notebook_id: uuid.UUID
    material_type: str
    title: str
    generation_status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StudyMaterialResponse(BaseModel):
    """Full detail of a saved study material."""

    id: uuid.UUID
    notebook_id: uuid.UUID
    material_type: str
    title: str
    content: Optional[str] = None
    structured_content: Optional[dict[str, Any]] = None
    generation_status: str
    configuration: Optional[dict[str, Any]] = None
    source_references: Optional[list[dict[str, Any]]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
