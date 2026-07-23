"""Conversations and chat assistant API router."""

import json
import logging
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from google.genai import types
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db_session
from app.models.conversation import Conversation, Message
from app.models.document import Document
from app.schemas.conversation import (
    ChatMessageRequest,
    ConversationCreateRequest,
    ConversationRenameRequest,
    ConversationResponse,
    MessageResponse,
)
from app.services.gemini_service import GeminiService, GeminiServiceError
from app.services.prompt_service import PromptService
from app.services.generation_service import GenerationService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/conversations")

@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_conversation(
    request: ConversationCreateRequest,
    db: Session = Depends(get_db_session),
) -> Conversation:
    """Create a new chat conversation, optionally linked to a specific document context."""
    if request.document_id:
        doc = db.query(Document).filter(Document.id == request.document_id).first()
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    conversation = Conversation(
        document_id=request.document_id,
        title=request.title,
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation

@router.get("", response_model=List[ConversationResponse])
def list_conversations(
    db: Session = Depends(get_db_session),
) -> List[Conversation]:
    """Retrieve all conversations, ordered by latest activity."""
    return (
        db.query(Conversation)
        .order_by(Conversation.updated_at.desc())
        .all()
    )

@router.patch("/{id}", response_model=ConversationResponse)
def rename_conversation(
    id: uuid.UUID,
    request: ConversationRenameRequest,
    db: Session = Depends(get_db_session),
) -> Conversation:
    """Rename a conversation's title."""
    conversation = db.query(Conversation).filter(Conversation.id == id).first()
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    conversation.title = request.title
    db.commit()
    db.refresh(conversation)
    return conversation

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(
    id: uuid.UUID,
    db: Session = Depends(get_db_session),
) -> None:
    """Delete a conversation and all its associated messages."""
    conversation = db.query(Conversation).filter(Conversation.id == id).first()
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    db.delete(conversation)
    db.commit()

@router.get("/{id}/messages", response_model=List[MessageResponse])
def get_conversation_messages(
    id: uuid.UUID,
    db: Session = Depends(get_db_session),
) -> List[Message]:
    """List all messages in a conversation."""
    conversation = db.query(Conversation).filter(Conversation.id == id).first()
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    return conversation.messages


def _sse_event(event: str, data: dict[str, str]) -> str:
    """Encode one server-sent event without allowing payloads to break its framing."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"

@router.post("/{id}/chat")
async def chat_in_conversation(
    id: uuid.UUID,
    request: ChatMessageRequest,
    db: Session = Depends(get_db_session),
) -> StreamingResponse:
    """Submit a message to a conversation and stream the Gemini AI assistant response."""
    conversation = db.query(Conversation).filter(Conversation.id == id).first()
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    # 1. Save user message to database
    user_msg = Message(
        conversation_id=id,
        role="user",
        content=request.message,
    )
    db.add(user_msg)
    db.commit()

    async def event_stream():
        settings = get_settings()

        # Retrieve all messages for context (includes the user message just saved)
        all_messages = db.query(Message).filter(Message.conversation_id == id).order_by(Message.created_at.asc()).all()

        doc_filename = conversation.document.original_filename if conversation.document else None
        doc_text = conversation.document.extracted_text if conversation.document else None

        model_name = request.model if request.model else settings.gemini_model
        temperature = request.temperature

        ai_response_text = ""
        try:
            gemini_service = GeminiService(settings)
            gen_service = GenerationService(gemini_service)
            stream = gen_service.stream_chat(
                messages=all_messages,
                doc_filename=doc_filename,
                doc_text=doc_text,
                model=model_name,
                temperature=temperature,
            )

            async for delta in stream:
                ai_response_text += delta
                yield _sse_event("delta", {"text": delta})

            # Save the full AI response to the database
            ai_msg = Message(
                conversation_id=id,
                role="assistant",
                content=ai_response_text,
            )
            db.add(ai_msg)
            db.commit()
            yield _sse_event("done", {})

        except GeminiServiceError as err:
            logger.info("Chat generation failed: %s", err)
            yield _sse_event("error", {"message": str(err)})
        except Exception:
            logger.exception("Chat generation failed unexpectedly.")
            yield _sse_event("error", {"message": "Study assistant is temporarily unavailable."})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

@router.post("/{id}/edit-message/{message_id}")
async def edit_message_and_regenerate(
    id: uuid.UUID,
    message_id: uuid.UUID,
    request: ChatMessageRequest,
    db: Session = Depends(get_db_session),
) -> StreamingResponse:
    """Edit a previous user message, delete all subsequent messages, and stream a new response."""
    conversation = db.query(Conversation).filter(Conversation.id == id).first()
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    target_msg = db.query(Message).filter(Message.id == message_id, Message.conversation_id == id).first()
    if not target_msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found.")

    # Delete all messages in the conversation created after the target message
    db.query(Message).filter(
        Message.conversation_id == id,
        Message.created_at > target_msg.created_at
    ).delete(synchronize_session=False)

    # Update the target message content
    target_msg.content = request.message
    db.commit()

    async def event_stream():
        settings = get_settings()

        all_messages = db.query(Message).filter(Message.conversation_id == id).order_by(Message.created_at.asc()).all()

        doc_filename = conversation.document.original_filename if conversation.document else None
        doc_text = conversation.document.extracted_text if conversation.document else None

        model_name = request.model if request.model else settings.gemini_model
        temperature = request.temperature

        ai_response_text = ""
        try:
            gemini_service = GeminiService(settings)
            gen_service = GenerationService(gemini_service)
            stream = gen_service.stream_chat(
                messages=all_messages,
                doc_filename=doc_filename,
                doc_text=doc_text,
                model=model_name,
                temperature=temperature,
            )

            async for delta in stream:
                ai_response_text += delta
                yield _sse_event("delta", {"text": delta})

            ai_msg = Message(
                conversation_id=id,
                role="assistant",
                content=ai_response_text,
            )
            db.add(ai_msg)
            db.commit()
            yield _sse_event("done", {})

        except GeminiServiceError as err:
            logger.info("Chat generation failed: %s", err)
            yield _sse_event("error", {"message": str(err)})
        except Exception:
            logger.exception("Chat generation failed unexpectedly.")
            yield _sse_event("error", {"message": "Study assistant is temporarily unavailable."})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

@router.delete("/{id}/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_message(
    id: uuid.UUID,
    message_id: uuid.UUID,
    db: Session = Depends(get_db_session),
) -> None:
    """Delete a specific message from a conversation."""
    conversation = db.query(Conversation).filter(Conversation.id == id).first()
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    msg = db.query(Message).filter(Message.id == message_id, Message.conversation_id == id).first()
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found.")

    db.delete(msg)
    db.commit()
