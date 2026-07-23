"""Document upload and library management API router."""

import logging
import uuid
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db_session
from app.models.document import Document
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
    file: UploadFile = File(...),
    db: Session = Depends(get_db_session),
) -> DocumentUploadResponse:
    """Stage, parse, and store one PDF document."""
    settings = get_settings()
    try:
        document = await DocumentService(settings).process(file, db)
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
    db: Session = Depends(get_db_session),
) -> List[Document]:
    """List all persistent documents in the library."""
    return (
        db.query(Document)
        .order_by(Document.created_at.desc())
        .all()
    )

@router.patch("/{id}", response_model=DocumentResponse)
def rename_document(
    id: uuid.UUID,
    request: DocumentRenameRequest,
    db: Session = Depends(get_db_session),
) -> Document:
    """Rename an existing document's filename."""
    try:
        service = DocumentService(get_settings())
        updated_doc = service.rename(db, id, request.filename)
        return updated_doc
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    id: uuid.UUID,
    db: Session = Depends(get_db_session),
) -> None:
    """Delete a document metadata and its physical file."""
    document = db.query(Document).filter(Document.id == id).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
        
    try:
        service = DocumentService(get_settings())
        service.delete(db, id)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error

@router.put("/{id}", response_model=DocumentResponse)
async def replace_document(
    id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db_session),
) -> Document:
    """Replace the PDF file and re-extract text for an existing document."""
    try:
        service = DocumentService(get_settings())
        updated_doc = await service.replace(file, db, id)
        return updated_doc
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except (UploadValidationError, PdfProcessingError) as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error
    except Exception:
        logger.exception("Document replacement failed unexpectedly.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The document could not be replaced. Please try again.",
        )
