"""Document upload and library management API router."""

import logging
import uuid
from typing import Annotated, List

from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_optional_current_user
from app.core.config import get_settings
from app.db.session import get_db_session
from app.models.document import Document
from app.models.user import User
from app.schemas.document import (
    DocumentRenameRequest,
    DocumentResponse,
    DocumentUploadResponse,
)
from app.services.document_service import DocumentService, UploadValidationError
from app.services.pdf_service import PdfProcessingError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents")


@router.post("", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    current_user: Annotated[User, Depends(get_current_user)],
    file: UploadFile = File(...),
    x_session_id: str | None = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db_session),
) -> DocumentUploadResponse:
    """Stage, parse, and store one PDF document."""
    settings = get_settings()
    try:
        document = await DocumentService(settings).process(
            file,
            db,
            session_id=x_session_id,
            user_id=current_user.id,
        )
        return DocumentUploadResponse(
            id=document.id,
            filename=document.original_filename,
            page_count=document.page_count,
            extracted_text=document.extracted_text,
        )
    except (UploadValidationError, PdfProcessingError) as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error
    except Exception:
        logger.exception("Document upload failed unexpectedly.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The document could not be uploaded. Please try again.",
        )


@router.get("", response_model=List[DocumentResponse])
def list_documents(
    x_session_id: str | None = Header(None, alias="X-Session-ID"),
    optional_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
    db: Session = Depends(get_db_session),
) -> List[Document]:
    """List all persistent documents in the library."""
    if not optional_user:
        return []

    query = db.query(Document).filter(Document.user_id == optional_user.id)
    return query.order_by(Document.created_at.desc()).all()


@router.patch("/{id}", response_model=DocumentResponse)
def rename_document(
    id: uuid.UUID,
    request: DocumentRenameRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db_session),
) -> Document:
    """Rename an existing document's filename."""
    try:
        service = DocumentService(get_settings())
        updated_doc = service.rename(db, id, request.filename, user_id=current_user.id)
        return updated_doc
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.") from error


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db_session),
) -> None:
    """Delete a document metadata and its physical file."""
    try:
        service = DocumentService(get_settings())
        service.delete(db, id, user_id=current_user.id)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.") from error


@router.put("/{id}", response_model=DocumentResponse)
async def replace_document(
    id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    file: UploadFile = File(...),
    db: Session = Depends(get_db_session),
) -> Document:
    """Replace the PDF file and re-extract text for an existing document."""
    try:
        service = DocumentService(get_settings())
        updated_doc = await service.replace(file, db, id, user_id=current_user.id)
        return updated_doc
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.") from error
    except (UploadValidationError, PdfProcessingError) as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error
    except Exception:
        logger.exception("Document replacement failed unexpectedly.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The document could not be replaced. Please try again.",
        )
