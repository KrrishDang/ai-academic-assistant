"""Generation pipeline API router."""

import json
import logging
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.core.config import get_settings
from app.schemas.document import NotesGenerationRequest
from app.services.gemini_service import GeminiService, GeminiServiceError
from app.services.generation_service import GenerationService

logger = logging.getLogger(__name__)

router = APIRouter()

def get_generation_service() -> GenerationService:
    """Dependency injection helper for GenerationService orchestrator."""
    settings = get_settings()
    gemini_service = GeminiService(settings)
    return GenerationService(gemini_service)

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

@router.post("/generate/notes")
@router.post("/generation/notes")
async def generate_notes(
    request: NotesGenerationRequest,
    service: GenerationService = Depends(get_generation_service),
) -> StreamingResponse:
    """Stream Markdown study notes from extracted PDF text as server-sent events."""
    stream = await service.stream_study_notes(request.extracted_text)
    return _stream_response(stream)

@router.post("/generate/5-mark-answer")
@router.post("/generation/five-mark")
async def generate_five_mark(
    request: NotesGenerationRequest,
    service: GenerationService = Depends(get_generation_service),
) -> StreamingResponse:
    """Stream a concise short-form answer suitable for a five-mark question."""
    stream = await service.stream_five_mark_answer(request.extracted_text)
    return _stream_response(stream)

@router.post("/generate/10-mark-answer")
@router.post("/generation/ten-mark")
async def generate_ten_mark(
    request: NotesGenerationRequest,
    service: GenerationService = Depends(get_generation_service),
) -> StreamingResponse:
    """Stream a detailed long-form essay answer suitable for a ten-mark question."""
    stream = await service.stream_ten_mark_answer(request.extracted_text)
    return _stream_response(stream)

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

@router.post("/generate/mcqs")
@router.post("/generation/mcqs")
async def generate_mcqs(
    request: NotesGenerationRequest,
    service: GenerationService = Depends(get_generation_service),
) -> StreamingResponse:
    """Generate structured multiple-choice questions (MCQs) and their answers."""
    return _stream_structured_response(service.generate_mcqs_structured(request.extracted_text))

@router.post("/generate/viva-questions")
@router.post("/generation/viva")
async def generate_viva(
    request: NotesGenerationRequest,
    service: GenerationService = Depends(get_generation_service),
) -> StreamingResponse:
    """Generate structured viva exam questions with concise expected answers."""
    return _stream_structured_response(service.generate_viva_structured(request.extracted_text))

@router.post("/generate/explain-simply")
@router.post("/generation/explain")
async def explain_simply(
    request: NotesGenerationRequest,
    service: GenerationService = Depends(get_generation_service),
) -> StreamingResponse:
    """Stream a simple beginner-friendly explanation of the document text."""
    stream = await service.stream_simple_explanation(request.extracted_text)
    return _stream_response(stream)

@router.post("/generate/flashcards")
async def generate_flashcards(
    request: NotesGenerationRequest,
    service: GenerationService = Depends(get_generation_service),
) -> StreamingResponse:
    """Generate structured flashcards."""
    return _stream_structured_response(service.generate_flashcards_structured(request.extracted_text))

@router.post("/generate/summary")
async def generate_summary(
    request: NotesGenerationRequest,
    service: GenerationService = Depends(get_generation_service),
) -> StreamingResponse:
    """Stream Markdown study summary from extracted PDF text."""
    stream = await service.stream_summary(request.extracted_text)
    return _stream_response(stream)
