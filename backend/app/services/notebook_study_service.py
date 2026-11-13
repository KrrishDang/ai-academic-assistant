"""Service for generating notebook-scoped study materials (study guides, flashcards, exam papers)."""

from __future__ import annotations

import logging
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models.notebook import Notebook
from app.models.source import Source
from app.models.study_material import StudyMaterial
from app.schemas.study_material import (
    ExamPaperContent,
    ExamPaperGenerateRequest,
    FlashcardsContent,
    FlashcardsGenerateRequest,
    StudyGuideGenerateRequest,
)
from app.services.gemini_service import GeminiService
from app.services.grounding_service import GroundingService, SourceChunk
from app.services.json_parser import (
    parse_and_validate_notebook_exam_paper,
    parse_and_validate_notebook_flashcards,
)
from app.services.prompt_service import PromptService

logger = logging.getLogger(__name__)


class NotebookStudyServiceError(Exception):
    """Base error for notebook study generation service."""
    pass


class NotebookNotFoundError(NotebookStudyServiceError):
    """Raised when the target notebook is missing or not owned by the requesting user."""
    pass


class EmptyNotebookError(NotebookStudyServiceError):
    """Raised when the target notebook contains no processed source documents."""
    pass


class InvalidConfigurationError(NotebookStudyServiceError):
    """Raised when study material generation parameters are invalid or infeasible."""
    pass


class NotebookStudyService:
    """Orchestrates whole-notebook grounded generation and persistence."""

    def __init__(self, settings: Settings, gemini_service: GeminiService | None = None) -> None:
        self._settings = settings
        self._gemini_service = gemini_service or GeminiService(settings)
        self._grounding_service = GroundingService(settings)

    def _assemble_notebook_grounding(
        self,
        notebook_id: uuid.UUID,
        user_id: uuid.UUID,
        db: Session,
    ) -> tuple[Notebook, str, list[dict[str, Any]], bool, list[SourceChunk], list[SourceChunk]]:
        """Retrieve authorized notebook, chunk and balance all processed sources within budget."""
        # 1. Enforce notebook ownership
        notebook = db.scalar(
            select(Notebook).where(
                Notebook.id == notebook_id,
                Notebook.user_id == user_id,
            )
        )
        if not notebook:
            logger.warning(
                "Access denied or notebook not found: notebook_id=%s, user_id=%s",
                notebook_id,
                user_id,
            )
            raise NotebookNotFoundError("Notebook not found.")

        # 2. Retrieve completed sources belonging to this notebook
        sources = db.scalars(
            select(Source)
            .where(
                Source.notebook_id == notebook_id,
                Source.processing_status == "completed",
            )
            .order_by(Source.created_at.asc())
        ).all()

        valid_sources = [s for s in sources if s.extracted_text and s.extracted_text.strip()]
        if not valid_sources:
            logger.info("Notebook %s has no processed sources with readable text", notebook_id)
            raise EmptyNotebookError("Notebook has no processed sources to generate study materials from.")

        # 3. Chunk all sources and interleave for balanced multi-source representation
        all_chunks: list[SourceChunk] = []
        for src in valid_sources:
            chunks = self._grounding_service._chunk_source(src)
            all_chunks.extend(chunks)

        if not all_chunks:
            raise EmptyNotebookError("Notebook has no text content available for generation.")

        interleaved = self._grounding_service._interleave_chunks(all_chunks)
        budgeted = self._grounding_service._budget_chunks(interleaved)
        is_truncated = len(budgeted) < len(all_chunks)

        grounding_context, _ = self._grounding_service._format_context_and_citations(budgeted)

        source_refs = [
            {
                "source_id": str(s.id),
                "title": s.display_title or s.original_filename or "Untitled Source",
            }
            for s in valid_sources
        ]

        logger.info(
            "Assembled notebook grounding for %s: %d sources, %d total chunks, %d budgeted (truncated=%s)",
            notebook_id,
            len(valid_sources),
            len(all_chunks),
            len(budgeted),
            is_truncated,
        )

        return notebook, grounding_context, source_refs, is_truncated, all_chunks, budgeted

    async def generate_study_guide(
        self,
        *,
        notebook_id: uuid.UUID,
        user_id: uuid.UUID,
        request: StudyGuideGenerateRequest,
        db: Session,
    ) -> StudyMaterial:
        """Generate and persist comprehensive structured study notes."""
        notebook, grounding_context, source_refs, is_truncated, all_chunks, budgeted = (
            self._assemble_notebook_grounding(notebook_id, user_id, db)
        )

        instructions = PromptService.build_notebook_study_guide_prompt(
            grounding_context=grounding_context,
            focus_topics=request.focus_topics,
        )

        raw_text = await self._gemini_service.generate_text(
            instructions=instructions,
            input_text="Generate the comprehensive course study guide based strictly on the provided grounding context.",
        )

        title = (
            request.title.strip()
            if request.title and request.title.strip()
            else f"Study Guide: {notebook.title}"
        )

        configuration = {
            "focus_topics": request.focus_topics,
            "truncated": is_truncated,
            "total_chunks": len(all_chunks),
            "budgeted_chunks": len(budgeted),
        }

        material = StudyMaterial(
            notebook_id=notebook_id,
            material_type="study_guide",
            title=title,
            content=raw_text,
            structured_content=None,
            generation_status="completed",
            configuration=configuration,
            source_references=source_refs,
        )
        db.add(material)
        db.commit()
        db.refresh(material)
        return material

    async def generate_flashcards(
        self,
        *,
        notebook_id: uuid.UUID,
        user_id: uuid.UUID,
        request: FlashcardsGenerateRequest,
        db: Session,
    ) -> StudyMaterial:
        """Generate and persist structured flashcard collection."""
        notebook, grounding_context, source_refs, is_truncated, all_chunks, budgeted = (
            self._assemble_notebook_grounding(notebook_id, user_id, db)
        )

        instructions = PromptService.build_notebook_flashcards_prompt(
            grounding_context=grounding_context,
            num_cards=request.num_cards,
            difficulty=request.difficulty,
        )

        raw_text = await self._gemini_service.generate_text(
            instructions=instructions,
            input_text="Generate the active-recall study flashcards JSON based strictly on the grounding context.",
        )

        validated: FlashcardsContent
        try:
            validated = parse_and_validate_notebook_flashcards(raw_text)
        except Exception as first_err:
            logger.warning("Flashcard JSON validation failed on first attempt: %s. Retrying with explicit hint.", first_err)
            raw_text_retry = await self._gemini_service.generate_text(
                instructions=instructions + "\nCRITICAL: Return ONLY valid, parseable JSON.",
                input_text="Generate the active-recall study flashcards JSON based strictly on the grounding context.",
            )
            validated = parse_and_validate_notebook_flashcards(raw_text_retry)

        title = (
            request.title.strip()
            if request.title and request.title.strip()
            else f"Flashcards: {notebook.title}"
        )

        configuration = {
            "num_cards": request.num_cards,
            "difficulty": request.difficulty,
            "truncated": is_truncated,
            "total_chunks": len(all_chunks),
            "budgeted_chunks": len(budgeted),
        }

        material = StudyMaterial(
            notebook_id=notebook_id,
            material_type="flashcards",
            title=title,
            content=None,
            structured_content=validated.model_dump(),
            generation_status="completed",
            configuration=configuration,
            source_references=source_refs,
        )
        db.add(material)
        db.commit()
        db.refresh(material)
        return material

    async def generate_exam_paper(
        self,
        *,
        notebook_id: uuid.UUID,
        user_id: uuid.UUID,
        request: ExamPaperGenerateRequest,
        db: Session,
    ) -> StudyMaterial:
        """Generate and persist structured examination paper."""
        # 1. Validate exam configuration feasibility
        if request.total_marks <= 0:
            raise InvalidConfigurationError("Total marks must be greater than zero.")

        valid_types = {"five_mark", "ten_mark"}
        requested_types = set(request.question_types)
        if not requested_types.issubset(valid_types) or len(requested_types) == 0:
            raise InvalidConfigurationError("Question types must include 'five_mark' and/or 'ten_mark'.")

        if "five_mark" in requested_types and "ten_mark" not in requested_types:
            if request.total_marks % 5 != 0:
                raise InvalidConfigurationError(f"Total marks ({request.total_marks}) must be a multiple of 5 for 5-mark questions.")
        elif "ten_mark" in requested_types and "five_mark" not in requested_types:
            if request.total_marks % 10 != 0:
                raise InvalidConfigurationError(f"Total marks ({request.total_marks}) must be a multiple of 10 for 10-mark questions.")
        else:
            # Both 5-mark and 10-mark questions allowed: any multiple of 5 is feasible
            if request.total_marks % 5 != 0:
                raise InvalidConfigurationError(f"Total marks ({request.total_marks}) must be a multiple of 5.")

        notebook, grounding_context, source_refs, is_truncated, all_chunks, budgeted = (
            self._assemble_notebook_grounding(notebook_id, user_id, db)
        )

        instructions = PromptService.build_notebook_exam_paper_prompt(
            grounding_context=grounding_context,
            total_marks=request.total_marks,
            question_types=request.question_types,
            difficulty=request.difficulty,
            include_answer_key=request.include_answer_key,
        )

        raw_text = await self._gemini_service.generate_text(
            instructions=instructions,
            input_text="Generate the university examination paper JSON based strictly on the grounding context.",
        )

        validated: ExamPaperContent
        try:
            validated = parse_and_validate_notebook_exam_paper(
                raw_text,
                expected_total_marks=request.total_marks,
            )
        except Exception as first_err:
            logger.warning("Exam paper JSON validation failed on first attempt: %s. Retrying with explicit hint.", first_err)
            raw_text_retry = await self._gemini_service.generate_text(
                instructions=instructions + "\nCRITICAL: Return ONLY valid, parseable JSON.",
                input_text="Generate the university examination paper JSON based strictly on the grounding context.",
            )
            validated = parse_and_validate_notebook_exam_paper(
                raw_text_retry,
                expected_total_marks=request.total_marks,
            )

        title = (
            request.title.strip()
            if request.title and request.title.strip()
            else f"Exam Paper ({request.total_marks} Marks): {notebook.title}"
        )

        configuration = {
            "total_marks": request.total_marks,
            "question_types": request.question_types,
            "difficulty": request.difficulty,
            "include_answer_key": request.include_answer_key,
            "truncated": is_truncated,
            "total_chunks": len(all_chunks),
            "budgeted_chunks": len(budgeted),
        }

        material = StudyMaterial(
            notebook_id=notebook_id,
            material_type="exam_paper",
            title=title,
            content=None,
            structured_content=validated.model_dump(),
            generation_status="completed",
            configuration=configuration,
            source_references=source_refs,
        )
        db.add(material)
        db.commit()
        db.refresh(material)
        return material
