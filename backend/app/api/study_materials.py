"""API router for notebook study studio generation and material management."""

from __future__ import annotations

import logging
import uuid
from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.core.config import get_settings
from app.db.session import get_db_session
from app.models.notebook import Notebook
from app.models.study_material import StudyMaterial
from app.models.user import User
from app.schemas.study_material import (
    ExamPaperGenerateRequest,
    FlashcardsGenerateRequest,
    StudyGuideGenerateRequest,
    StudyMaterialResponse,
)
from app.services.gemini_service import GeminiService, GeminiServiceError
from app.services.notebook_study_service import (
    EmptyNotebookError,
    InvalidConfigurationError,
    NotebookNotFoundError,
    NotebookStudyService,
)

logger = logging.getLogger(__name__)

notebook_study_router = APIRouter(prefix="/notebooks", tags=["notebooks", "study-studio"])
study_materials_router = APIRouter(prefix="/study-materials", tags=["study-materials"])


def get_study_service() -> NotebookStudyService:
    """Dependency helper to create NotebookStudyService."""
    settings = get_settings()
    gemini_service = GeminiService(settings)
    return NotebookStudyService(settings, gemini_service)


# ─── Notebook-Scoped Generation Endpoints ─────────────────────────────────────

@notebook_study_router.post(
    "/{notebook_id}/generate/study-guide",
    response_model=StudyMaterialResponse,
    status_code=status.HTTP_201_CREATED,
)
async def generate_notebook_study_guide(
    notebook_id: uuid.UUID,
    request: StudyGuideGenerateRequest = StudyGuideGenerateRequest(),
    current_user: Annotated[User, Depends(get_current_user)] = None,
    service: NotebookStudyService = Depends(get_study_service),
    db: Session = Depends(get_db_session),
) -> StudyMaterialResponse:
    """Generate comprehensive structured study notes from all eligible processed notebook sources."""
    try:
        material = await service.generate_study_guide(
            notebook_id=notebook_id,
            user_id=current_user.id,
            request=request,
            db=db,
        )
        return StudyMaterialResponse.model_validate(material)
    except NotebookNotFoundError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err)) from err
    except EmptyNotebookError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err)) from err
    except GeminiServiceError as err:
        logger.error("Gemini failure generating study guide: %s", err)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Study assistant generation failed: {err}",
        ) from err
    except Exception as err:
        logger.exception("Unexpected error generating study guide for notebook %s", notebook_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate study guide due to an internal server error.",
        ) from err


@notebook_study_router.post(
    "/{notebook_id}/generate/flashcards",
    response_model=StudyMaterialResponse,
    status_code=status.HTTP_201_CREATED,
)
async def generate_notebook_flashcards(
    notebook_id: uuid.UUID,
    request: FlashcardsGenerateRequest = FlashcardsGenerateRequest(),
    current_user: Annotated[User, Depends(get_current_user)] = None,
    service: NotebookStudyService = Depends(get_study_service),
    db: Session = Depends(get_db_session),
) -> StudyMaterialResponse:
    """Generate structured active-recall flashcards from all eligible processed notebook sources."""
    try:
        material = await service.generate_flashcards(
            notebook_id=notebook_id,
            user_id=current_user.id,
            request=request,
            db=db,
        )
        return StudyMaterialResponse.model_validate(material)
    except NotebookNotFoundError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err)) from err
    except EmptyNotebookError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err)) from err
    except GeminiServiceError as err:
        logger.error("Gemini failure generating flashcards: %s", err)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Study assistant generation failed: {err}",
        ) from err
    except Exception as err:
        logger.exception("Unexpected error generating flashcards for notebook %s", notebook_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate flashcards due to an internal server error.",
        ) from err


@notebook_study_router.post(
    "/{notebook_id}/generate/exam-paper",
    response_model=StudyMaterialResponse,
    status_code=status.HTTP_201_CREATED,
)
async def generate_notebook_exam_paper(
    notebook_id: uuid.UUID,
    request: ExamPaperGenerateRequest,
    current_user: Annotated[User, Depends(get_current_user)] = None,
    service: NotebookStudyService = Depends(get_study_service),
    db: Session = Depends(get_db_session),
) -> StudyMaterialResponse:
    """Generate a structured examination paper with 5-mark and/or 10-mark questions and model answers."""
    try:
        material = await service.generate_exam_paper(
            notebook_id=notebook_id,
            user_id=current_user.id,
            request=request,
            db=db,
        )
        return StudyMaterialResponse.model_validate(material)
    except NotebookNotFoundError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err)) from err
    except EmptyNotebookError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err)) from err
    except InvalidConfigurationError as err:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(err)) from err
    except GeminiServiceError as err:
        logger.error("Gemini failure generating exam paper: %s", err)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Study assistant generation failed: {err}",
        ) from err
    except Exception as err:
        logger.exception("Unexpected error generating exam paper for notebook %s", notebook_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate exam paper due to an internal server error.",
        ) from err


@notebook_study_router.get(
    "/{notebook_id}/study-materials",
    response_model=List[StudyMaterialResponse],
)
def list_notebook_study_materials(
    notebook_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db_session),
) -> List[StudyMaterialResponse]:
    """List all generated study materials belonging to an authorized notebook."""
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

    materials = db.scalars(
        select(StudyMaterial)
        .where(StudyMaterial.notebook_id == notebook_id)
        .order_by(StudyMaterial.created_at.desc())
    ).all()

    return [StudyMaterialResponse.model_validate(m) for m in materials]


# ─── Individual Study Material Management Endpoints ───────────────────────────

@study_materials_router.get(
    "/{material_id}",
    response_model=StudyMaterialResponse,
)
def get_study_material(
    material_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db_session),
) -> StudyMaterialResponse:
    """Retrieve an individual study material verifying ownership through notebook."""
    material = db.scalar(
        select(StudyMaterial)
        .join(Notebook, Notebook.id == StudyMaterial.notebook_id)
        .where(
            StudyMaterial.id == material_id,
            Notebook.user_id == current_user.id,
        )
    )
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study material not found",
        )

    return StudyMaterialResponse.model_validate(material)


@study_materials_router.delete(
    "/{material_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_study_material(
    material_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db_session),
) -> None:
    """Permanently delete an individual study material verifying ownership."""
    material = db.scalar(
        select(StudyMaterial)
        .join(Notebook, Notebook.id == StudyMaterial.notebook_id)
        .where(
            StudyMaterial.id == material_id,
            Notebook.user_id == current_user.id,
        )
    )
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study material not found",
        )

    db.delete(material)
    db.commit()
