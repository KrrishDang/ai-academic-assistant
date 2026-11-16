"""Generation pipeline API router."""

import json
import logging
import uuid
from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.db.session import get_db_session
from app.models.notebook import Notebook
from app.models.source import Source
from app.models.user import User
from app.schemas.document import NotesGenerationRequest
from app.services.gemini_service import GeminiService, GeminiServiceError
from app.services.generation_service import GenerationService

logger = logging.getLogger(__name__)

# Reasonable upper bound on generation input character budget (~50,000 tokens)
MAX_GENERATION_CHARS = 200_000

router = APIRouter(dependencies=[Depends(get_current_user)])

def get_generation_service() -> GenerationService:
    """Dependency injection helper for GenerationService orchestrator."""
    settings = get_settings()
    gemini_service = GeminiService(settings)
    return GenerationService(gemini_service)

def _resolve_generation_text(
    request: NotesGenerationRequest,
    current_user: User,
    db: Session,
) -> str:
    """Resolve generation text server-side from authorized source/notebook or fallback to provided text."""
    if request.source_id is not None:
        query = (
            select(Source)
            .join(Notebook, Notebook.id == Source.notebook_id)
            .where(
                Source.id == request.source_id,
                Notebook.user_id == current_user.id,
            )
        )
        if request.notebook_id is not None:
            query = query.where(Source.notebook_id == request.notebook_id)

        source = db.scalar(query)
        if not source:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Source not found or access denied.",
            )
        if source.processing_status != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Source processing is not completed.",
            )
        if not source.extracted_text or not source.extracted_text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No readable text available for this source.",
            )
        text = source.extracted_text.strip()
        if len(text) > MAX_GENERATION_CHARS:
            logger.info("Source text truncated from %d to %d chars", len(text), MAX_GENERATION_CHARS)
            text = text[:MAX_GENERATION_CHARS]
        return text

    if request.notebook_id is not None:
        notebook = db.scalar(
            select(Notebook).where(
                Notebook.id == request.notebook_id,
                Notebook.user_id == current_user.id,
            )
        )
        if not notebook:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notebook not found or access denied.",
            )
        sources = db.scalars(
            select(Source)
            .where(
                Source.notebook_id == request.notebook_id,
                Source.processing_status == "completed",
            )
            .order_by(Source.created_at.asc())
        ).all()
        texts = [s.extracted_text.strip() for s in sources if s.extracted_text and s.extracted_text.strip()]
        if not texts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No processed sources available in this notebook.",
            )
        assembled: list[str] = []
        current_len = 0
        separator = "\n\n---\n\n"
        for t in texts:
            if current_len + len(t) <= MAX_GENERATION_CHARS:
                assembled.append(t)
                current_len += len(t) + len(separator)
            else:
                remaining = MAX_GENERATION_CHARS - current_len
                if remaining > 500:
                    assembled.append(t[:remaining])
                break

        if not assembled:
            assembled = [texts[0][:MAX_GENERATION_CHARS]]

        return separator.join(assembled)

    if request.extracted_text and request.extracted_text.strip():
        text = request.extracted_text.strip()
        if len(text) > MAX_GENERATION_CHARS:
            text = text[:MAX_GENERATION_CHARS]
        return text

    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail="Either extracted_text, source_id, or notebook_id must be provided.",
    )

def _sse_event(event: str, data: dict) -> str:
    """Encode server-sent event formatting cleanly."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"

def _stream_response(stream_iterator: AsyncIterator[str]) -> StreamingResponse:
    """Utility helper to stream content chunks inside a standard SSE response format."""
    async def event_stream():
        try:
            async for delta in stream_iterator:
                yield _sse_event("delta", {"text": delta})
            yield _sse_event("done", {})
        except GeminiServiceError as error:
            logger.info("Study material generation failed: %s", error)
            yield _sse_event("error", {"message": str(error)})
        except Exception:
            logger.exception("Study material generation failed unexpectedly.")
            yield _sse_event("error", {"message": "Study material could not be generated. Please try again."})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

def _stream_structured_response(generator_coro) -> StreamingResponse:
    """Helper to stream validated structured JSON payloads over SSE."""
    async def event_stream():
        try:
            result = await generator_coro
            # Emit full validated JSON payload
            json_str = json.dumps(result["data"])
            yield _sse_event("delta", {"text": json_str})
            yield _sse_event("done", {})
        except GeminiServiceError as error:
            logger.info("Structured study material generation failed: %s", error)
            yield _sse_event("error", {"message": str(error)})
        except Exception as error:
            logger.exception("Structured study material generation failed unexpectedly.")
            yield _sse_event("error", {"message": f"Generation failed: {error}"})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

@router.post("/generate/notes")
@router.post("/generation/notes")
async def generate_notes(
    request: NotesGenerationRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
    service: GenerationService = Depends(get_generation_service),
) -> StreamingResponse:
    """Stream Markdown study notes from authorized sources or provided text."""
    text = _resolve_generation_text(request, current_user, db)
    stream = await service.stream_study_notes(text)
    return _stream_response(stream)

@router.post("/generate/5-mark-answer")
@router.post("/generation/five-mark")
async def generate_five_mark(
    request: NotesGenerationRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
    service: GenerationService = Depends(get_generation_service),
) -> StreamingResponse:
    """Stream a concise short-form answer suitable for a five-mark question."""
    text = _resolve_generation_text(request, current_user, db)
    stream = await service.stream_five_mark_answer(text)
    return _stream_response(stream)

@router.post("/generate/10-mark-answer")
@router.post("/generation/ten-mark")
async def generate_ten_mark(
    request: NotesGenerationRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
    service: GenerationService = Depends(get_generation_service),
) -> StreamingResponse:
    """Stream a detailed long-form essay answer suitable for a ten-mark question."""
    text = _resolve_generation_text(request, current_user, db)
    stream = await service.stream_ten_mark_answer(text)
    return _stream_response(stream)

@router.post("/generate/mcqs")
@router.post("/generation/mcqs")
async def generate_mcqs(
    request: NotesGenerationRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
    service: GenerationService = Depends(get_generation_service),
) -> StreamingResponse:
    """Generate structured multiple-choice questions (MCQs) and their answers."""
    text = _resolve_generation_text(request, current_user, db)
    return _stream_structured_response(service.generate_mcqs_structured(text))

@router.post("/generate/viva-questions")
@router.post("/generation/viva")
async def generate_viva(
    request: NotesGenerationRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
    service: GenerationService = Depends(get_generation_service),
) -> StreamingResponse:
    """Generate structured viva exam questions with concise expected answers."""
    text = _resolve_generation_text(request, current_user, db)
    return _stream_structured_response(service.generate_viva_structured(text))

@router.post("/generate/explain-simply")
@router.post("/generation/explain")
async def explain_simply(
    request: NotesGenerationRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
    service: GenerationService = Depends(get_generation_service),
) -> StreamingResponse:
    """Stream a simple beginner-friendly explanation of the document text."""
    text = _resolve_generation_text(request, current_user, db)
    stream = await service.stream_simple_explanation(text)
    return _stream_response(stream)

@router.post("/generate/flashcards")
async def generate_flashcards(
    request: NotesGenerationRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
    service: GenerationService = Depends(get_generation_service),
) -> StreamingResponse:
    """Generate structured flashcards."""
    text = _resolve_generation_text(request, current_user, db)
    return _stream_structured_response(service.generate_flashcards_structured(text))

@router.post("/generate/summary")
async def generate_summary(
    request: NotesGenerationRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
    service: GenerationService = Depends(get_generation_service),
) -> StreamingResponse:
    """Stream Markdown study summary from extracted PDF text."""
    text = _resolve_generation_text(request, current_user, db)
    stream = await service.stream_summary(text)
    return _stream_response(stream)
