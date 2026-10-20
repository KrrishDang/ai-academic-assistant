"""Conversations and chat assistant API router."""

import json
import logging
import uuid
from typing import Annotated, List

from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.responses import StreamingResponse
from google.genai import types
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_optional_current_user
from app.core.config import get_settings
from app.db.session import get_db_session
from app.models.conversation import Conversation, Message
from app.models.document import Document
from app.models.notebook import Notebook
from app.models.user import User
from app.schemas.conversation import (
    ChatMessageRequest,
    ConversationCreateRequest,
    ConversationRenameRequest,
    ConversationResponse,
    MessageResponse,
)
from app.services.gemini_service import GeminiService, GeminiServiceError
from app.services.generation_service import GenerationService
from app.services.prompt_service import PromptService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/conversations")


def _get_conversation_or_404(
    conversation_id: uuid.UUID,
    current_user: User | None,
    db: Session,
) -> Conversation:
    """Retrieve conversation and enforce ownership isolation.

    - Authenticated users can only access their own conversations or public legacy ones.
    - Anonymous users can only access unowned (user_id IS NULL) conversations.
    - Non-existent or inaccessible conversations return 404 to avoid data enumeration.
    """
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    if current_user:
        if conversation.user_id is not None and conversation.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
    else:
        if conversation.user_id is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    return conversation


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_conversation(
    request: ConversationCreateRequest,
    x_session_id: str | None = Header(None, alias="X-Session-ID"),
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
    db: Session = Depends(get_db_session),
) -> Conversation:
    """Create a new chat conversation, optionally linked to a specific document or notebook context."""
    if request.document_id:
        doc = db.query(Document).filter(Document.id == request.document_id).first()
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    user_id: uuid.UUID | None = None
    session_id: str | None = None

    if request.notebook_id:
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to create a notebook conversation",
                headers={"WWW-Authenticate": "Bearer"},
            )
        notebook = db.scalar(
            select(Notebook).where(
                Notebook.id == request.notebook_id,
                Notebook.user_id == current_user.id,
            )
        )
        if not notebook:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notebook not found.")
        user_id = current_user.id
        session_id = None
    elif current_user:
        # Authenticated user takes precedence over X-Session-ID
        user_id = current_user.id
        session_id = None
    else:
        # Anonymous conversation
        user_id = None
        session_id = x_session_id

    default_title = "General Chat"
    if request.document_id and "doc" in locals() and doc:
        default_title = doc.original_filename

    conversation = Conversation(
        document_id=request.document_id,
        notebook_id=request.notebook_id,
        user_id=user_id,
        title=request.title or default_title,
        session_id=session_id,
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


@router.get("", response_model=List[ConversationResponse])
def list_conversations(
    x_session_id: str | None = Header(None, alias="X-Session-ID"),
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
    db: Session = Depends(get_db_session),
) -> List[Conversation]:
    """Retrieve conversations, ordered by latest activity."""
    query = db.query(Conversation)
    if current_user:
        # Authenticated user sees all their owned conversations (X-Session-ID cannot override identity)
        query = query.filter(Conversation.user_id == current_user.id)
    else:
        # Anonymous users only see unauthenticated conversations
        query = query.filter(Conversation.user_id.is_(None))
        if x_session_id:
            query = query.filter((Conversation.session_id == x_session_id) | (Conversation.session_id.is_(None)))

    return query.order_by(Conversation.updated_at.desc()).all()


@router.patch("/{id}", response_model=ConversationResponse)
def rename_conversation(
    id: uuid.UUID,
    request: ConversationRenameRequest,
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
    db: Session = Depends(get_db_session),
) -> Conversation:
    """Rename a conversation's title."""
    conversation = _get_conversation_or_404(id, current_user, db)
    conversation.title = request.title
    db.commit()
    db.refresh(conversation)
    return conversation


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(
    id: uuid.UUID,
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
    db: Session = Depends(get_db_session),
) -> None:
    """Delete a conversation and all its associated messages."""
    conversation = _get_conversation_or_404(id, current_user, db)
    db.delete(conversation)
    db.commit()


@router.get("/{id}/messages", response_model=List[MessageResponse])
def get_conversation_messages(
    id: uuid.UUID,
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
    db: Session = Depends(get_db_session),
) -> List[Message]:
    """List all messages in a conversation."""
    conversation = _get_conversation_or_404(id, current_user, db)
    return conversation.messages


def _sse_event(event: str, data: dict[str, str]) -> str:
    """Encode one server-sent event without allowing payloads to break its framing."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@router.post("/{id}/chat")
async def chat_in_conversation(
    id: uuid.UUID,
    request: ChatMessageRequest,
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
    db: Session = Depends(get_db_session),
) -> StreamingResponse:
    """Submit a message to a conversation and stream the Gemini AI assistant response."""
    conversation = _get_conversation_or_404(id, current_user, db)

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
        all_messages = (
            db.query(Message)
            .filter(Message.conversation_id == id)
            .order_by(Message.created_at.asc())
            .all()
        )

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
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
    db: Session = Depends(get_db_session),
) -> StreamingResponse:
    """Edit a previous user message, delete all subsequent messages, and stream a new response."""
    conversation = _get_conversation_or_404(id, current_user, db)

    target_msg = (
        db.query(Message)
        .filter(Message.id == message_id, Message.conversation_id == id)
        .first()
    )
    if not target_msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found.")

    # Delete all messages in the conversation created after the target message
    db.query(Message).filter(
        Message.conversation_id == id,
        Message.created_at > target_msg.created_at,
    ).delete(synchronize_session=False)

    # Update the target message content
    target_msg.content = request.message
    db.commit()

    async def event_stream():
        settings = get_settings()

        all_messages = (
            db.query(Message)
            .filter(Message.conversation_id == id)
            .order_by(Message.created_at.asc())
            .all()
        )

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
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
    db: Session = Depends(get_db_session),
) -> None:
    """Delete a specific message from a conversation."""
    _get_conversation_or_404(id, current_user, db)

    msg = db.query(Message).filter(Message.id == message_id, Message.conversation_id == id).first()
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found.")

    db.delete(msg)
    db.commit()
