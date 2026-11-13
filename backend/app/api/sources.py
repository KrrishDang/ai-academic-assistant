"""API endpoints for individual source management."""

import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.core.config import get_settings
from app.db.session import get_db_session
from app.models.notebook import Notebook
from app.models.source import Source
from app.models.user import User
from app.schemas.notebook import SourceResponse
from app.services.source_service import SourceService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sources", tags=["sources"])


@router.get("/{source_id}", response_model=SourceResponse)
def get_source(
    source_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> SourceResponse:
    """Retrieve metadata and processing status for an authorized source."""
    source = db.scalar(
        select(Source)
        .join(Notebook, Notebook.id == Source.notebook_id)
        .where(
            Source.id == source_id,
            Notebook.user_id == current_user.id,
        )
    )
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source not found",
        )

    return SourceResponse.model_validate(source)


@router.delete("/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_source(
    source_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> None:
    """Delete an authorized source and its physical storage."""
    source = db.scalar(
        select(Source)
        .join(Notebook, Notebook.id == Source.notebook_id)
        .where(
            Source.id == source_id,
            Notebook.user_id == current_user.id,
        )
    )
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source not found",
        )

    service = SourceService(get_settings())
    service.delete_source(source, db)
