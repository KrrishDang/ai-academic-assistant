"""API router for V2 notebook management."""

import logging
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.core.config import get_settings
from app.db.session import get_db_session
from app.models.conversation import Conversation
from app.models.notebook import Notebook
from app.models.source import Source
from app.models.user import User
from app.schemas.conversation import ConversationResponse
from app.schemas.notebook import (
    NotebookCreateRequest,
    NotebookDetailResponse,
    NotebookResponse,
    NotebookSummaryResponse,
    NotebookUpdateRequest,
    SourceResponse,
)
from app.services.source_service import SourceService, SourceValidationError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notebooks", tags=["notebooks"])


@router.post("", response_model=NotebookResponse, status_code=status.HTTP_201_CREATED)
def create_notebook(
    payload: NotebookCreateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> NotebookResponse:
    """Create a new notebook for the authenticated user."""
    notebook = Notebook(
        user_id=current_user.id,
        title=payload.title,
        description=payload.description,
    )
    db.add(notebook)
    db.commit()
    db.refresh(notebook)

    return NotebookResponse.model_validate(notebook)


@router.get("", response_model=list[NotebookSummaryResponse])
def list_notebooks(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> list[NotebookSummaryResponse]:
    """List all notebooks owned by the authenticated user with source and conversation counts."""
    notebooks = db.scalars(
        select(Notebook)
        .where(Notebook.user_id == current_user.id)
        .order_by(Notebook.updated_at.desc())
    ).all()

    result: list[NotebookSummaryResponse] = []
    for notebook in notebooks:
        source_count = (
            db.scalar(select(func.count(Source.id)).where(Source.notebook_id == notebook.id))
            or 0
        )
        conversation_count = (
            db.scalar(
                select(func.count(Conversation.id)).where(
                    Conversation.notebook_id == notebook.id,
                    Conversation.user_id == current_user.id,
                )
            )
            or 0
        )
        result.append(
            NotebookSummaryResponse(
                id=notebook.id,
                user_id=notebook.user_id,
                title=notebook.title,
                description=notebook.description,
                created_at=notebook.created_at,
                updated_at=notebook.updated_at,
                source_count=source_count,
                conversation_count=conversation_count,
            )
        )

    return result


@router.get("/{notebook_id}", response_model=NotebookDetailResponse)
def get_notebook_detail(
    notebook_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> NotebookDetailResponse:
    """Get detailed notebook view including sources and conversations."""
    notebook = db.scalar(
        select(Notebook).where(
            Notebook.id == notebook_id,
            Notebook.user_id == current_user.id,
        )
    )
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found",
        )

    sources = db.scalars(
        select(Source)
        .where(Source.notebook_id == notebook_id)
        .order_by(Source.created_at.asc())
    ).all()

    conversations = db.scalars(
        select(Conversation)
        .where(
            Conversation.notebook_id == notebook_id,
            Conversation.user_id == current_user.id,
        )
        .order_by(Conversation.updated_at.desc())
    ).all()

    return NotebookDetailResponse(
        id=notebook.id,
        user_id=notebook.user_id,
        title=notebook.title,
        description=notebook.description,
        created_at=notebook.created_at,
        updated_at=notebook.updated_at,
        sources=[SourceResponse.model_validate(s) for s in sources],
        conversations=[ConversationResponse.model_validate(c) for c in conversations],
    )


@router.patch("/{notebook_id}", response_model=NotebookResponse)
def update_notebook(
    notebook_id: uuid.UUID,
    payload: NotebookUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> NotebookResponse:
    """Update title and/or description of a notebook."""
    notebook = db.scalar(
        select(Notebook).where(
            Notebook.id == notebook_id,
            Notebook.user_id == current_user.id,
        )
    )
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found",
        )

    if payload.title is not None:
        notebook.title = payload.title
        # Keep underlying initial/main conversation title consistent
        initial_convs = db.scalars(
            select(Conversation).where(Conversation.notebook_id == notebook_id)
        ).all()
        if len(initial_convs) == 1 and initial_convs[0].title in ("Main Discussion", "Academic Discussion", "Course Discussion", "General Chat"):
            initial_convs[0].title = payload.title
    if payload.description is not None:
        notebook.description = payload.description

    notebook.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(notebook)

    return NotebookResponse.model_validate(notebook)


@router.delete("/{notebook_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notebook(
    notebook_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> None:
    """Delete a notebook owned by the authenticated user."""
    notebook = db.scalar(
        select(Notebook).where(
            Notebook.id == notebook_id,
            Notebook.user_id == current_user.id,
        )
    )
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found",
        )

    db.delete(notebook)
    db.commit()


@router.get("/{notebook_id}/conversations", response_model=list[ConversationResponse])
def get_notebook_conversations(
    notebook_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> list[ConversationResponse]:
    """List conversations belonging to a specific notebook."""
    notebook = db.scalar(
        select(Notebook).where(
            Notebook.id == notebook_id,
            Notebook.user_id == current_user.id,
        )
    )
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found",
        )

    conversations = db.scalars(
        select(Conversation)
        .where(
            Conversation.notebook_id == notebook_id,
            Conversation.user_id == current_user.id,
        )
        .order_by(Conversation.updated_at.desc())
    ).all()

    return [ConversationResponse.model_validate(c) for c in conversations]


@router.post("/{notebook_id}/sources", response_model=SourceResponse, status_code=status.HTTP_201_CREATED)
async def upload_notebook_source(
    notebook_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    file: UploadFile = File(...),
    db: Session = Depends(get_db_session),
) -> SourceResponse:
    """Upload and ingest a document source into an owned notebook."""
    notebook = db.scalar(
        select(Notebook).where(
            Notebook.id == notebook_id,
            Notebook.user_id == current_user.id,
        )
    )
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found",
        )

    service = SourceService(get_settings())
    try:
        source = await service.ingest_source(notebook, file, db)
        return SourceResponse.model_validate(source)
    except SourceValidationError as err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(err),
        ) from err
    except Exception as err:
        logger.exception("Failed to ingest source for notebook %s", notebook_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing the source document.",
        ) from err


@router.get("/{notebook_id}/sources", response_model=list[SourceResponse])
def list_notebook_sources(
    notebook_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> list[SourceResponse]:
    """List all sources attached to an owned notebook."""
    notebook = db.scalar(
        select(Notebook).where(
            Notebook.id == notebook_id,
            Notebook.user_id == current_user.id,
        )
    )
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found",
        )

    sources = db.scalars(
        select(Source)
        .where(Source.notebook_id == notebook_id)
        .order_by(Source.created_at.asc())
    ).all()

    return [SourceResponse.model_validate(s) for s in sources]
