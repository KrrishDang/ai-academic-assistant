"""Document upload and storage orchestration."""

import hashlib
import logging
import tempfile
import uuid
from dataclasses import dataclass
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models.document import Document
from app.services.pdf_service import PdfService
from app.services.storage_service import create_document_storage

logger = logging.getLogger(__name__)

PDF_SIGNATURE = b"%PDF-"
READ_CHUNK_SIZE = 1024 * 1024


class UploadValidationError(ValueError):
    """Raised when an upload violates the document acceptance policy."""


@dataclass(frozen=True)
class StagedUpload:
    """A validated PDF staged on disk only for extraction."""

    path: Path
    filename: str


class DocumentService:
    """Coordinates persistent upload validation, file storage, and database persistence."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._pdf_service = PdfService(max_pages=settings.max_pdf_pages)
        self._storage = create_document_storage(settings)

    async def process(self, file: UploadFile, db: Session) -> Document:
        """Validate, extract, store the PDF file and save metadata to DB."""
        doc_id = uuid.uuid4()
        staged_upload = await self._stage_upload(file)

        try:
            # 1. Extract text using PdfService
            extracted = self._pdf_service.extract_text(staged_upload.path)
            file_size = staged_upload.path.stat().st_size

            # 2. Compute sha256 hash
            sha256_hash = hashlib.sha256()
            with open(staged_upload.path, "rb") as f:
                while chunk := f.read(8192):
                    sha256_hash.update(chunk)
            file_sha = sha256_hash.hexdigest()

            # Check for duplicate upload
            existing_doc = db.query(Document).filter(Document.sha256 == file_sha).first()
            if existing_doc:
                logger.info(
                    "Duplicate upload detected. Returning existing document. ID: %s, Filename: %s",
                    existing_doc.id,
                    existing_doc.original_filename
                )
                return existing_doc

            # 3. Store the file permanently
            storage_key = f"uploads/{doc_id}.pdf"
            self._storage.save(staged_upload.path, storage_key)

            # 4. Save to Database
            document_record = Document(
                id=doc_id,
                original_filename=staged_upload.filename,
                content_type="application/pdf",
                file_size_bytes=file_size,
                page_count=extracted.page_count,
                text_character_count=len(extracted.text),
                storage_key=storage_key,
                sha256=file_sha,
                extracted_text=extracted.text,
            )

            db.add(document_record)
            db.commit()
            db.refresh(document_record)

            logger.info(
                "Document uploaded and processed successfully. ID: %s, Filename: %s, Size: %d bytes, Characters: %d, Pages: %d",
                doc_id,
                staged_upload.filename,
                file_size,
                len(extracted.text),
                extracted.page_count
            )
            return document_record
        except Exception:
            logger.exception("Failed to process document upload. Filename: %s", staged_upload.filename if 'staged_upload' in locals() else file.filename)
            raise

        finally:
            staged_upload.path.unlink(missing_ok=True)

    async def replace(self, file: UploadFile, db: Session, document_id: uuid.UUID) -> Document:
        """Replace an existing document version with a new PDF upload."""
        # Verify ownership
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise ValueError("Document not found.")

        staged_upload = await self._stage_upload(file)

        try:
            # 1. Extract new text
            extracted = self._pdf_service.extract_text(staged_upload.path)
            file_size = staged_upload.path.stat().st_size

            # 2. Compute new sha256 hash
            sha256_hash = hashlib.sha256()
            with open(staged_upload.path, "rb") as f:
                while chunk := f.read(8192):
                    sha256_hash.update(chunk)
            file_sha = sha256_hash.hexdigest()

            # 3. Replace stored file
            self._storage.save(staged_upload.path, document.storage_key)

            # 4. Update metadata in database
            document.original_filename = staged_upload.filename
            document.file_size_bytes = file_size
            document.page_count = extracted.page_count
            document.text_character_count = len(extracted.text)
            document.sha256 = file_sha
            document.extracted_text = extracted.text

            db.commit()
            db.refresh(document)

            logger.info(
                "Document replaced successfully. ID: %s, Filename: %s, Size: %d bytes, Characters: %d, Pages: %d",
                document.id,
                staged_upload.filename,
                file_size,
                len(extracted.text),
                extracted.page_count
            )
            return document
        except Exception:
            logger.exception("Failed to replace document. ID: %s", document_id)
            raise

        finally:
            staged_upload.path.unlink(missing_ok=True)

    def delete(self, db: Session, document_id: uuid.UUID) -> None:
        """Delete document metadata and remove stored file."""
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise ValueError("Document not found.")

        # 1. Delete physical file
        try:
            self._storage.delete(document.storage_key)
        except Exception as err:
            logger.warning("Failed to delete physical file for document %s: %s", document_id, err)

        # 2. Delete database record
        db.delete(document)
        db.commit()
        logger.info("Document deleted successfully from DB and storage. ID: %s", document_id)

    def rename(self, db: Session, document_id: uuid.UUID, new_name: str) -> Document:
        """Rename an existing document original filename."""
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise ValueError("Document not found.")

        # Ensure correct PDF extension
        if not new_name.lower().endswith(".pdf"):
            new_name = f"{new_name}.pdf"

        document.original_filename = new_name
        db.commit()
        db.refresh(document)
        return document

    async def _stage_upload(self, file: UploadFile) -> StagedUpload:
        self._validate_filename(file.filename)
        temporary_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        temporary_path = Path(temporary_file.name)
        size_bytes = 0
        header = b""

        try:
            with temporary_file:
                while chunk := await file.read(READ_CHUNK_SIZE):
                    size_bytes += len(chunk)
                    if size_bytes > self._settings.max_upload_size_bytes:
                        raise UploadValidationError("The PDF must be 20 MB or smaller.")
                    if len(header) < len(PDF_SIGNATURE):
                        header += chunk[: len(PDF_SIGNATURE) - len(header)]
                    temporary_file.write(chunk)

            if size_bytes == 0:
                raise UploadValidationError("The uploaded file is empty.")
            if header != PDF_SIGNATURE:
                raise UploadValidationError("Only valid PDF files can be uploaded.")

            return StagedUpload(
                path=temporary_path,
                filename=Path(file.filename or "document.pdf").name,
            )
        except Exception:
            temporary_path.unlink(missing_ok=True)
            raise
        finally:
            await file.close()

    @staticmethod
    def _validate_filename(filename: str | None) -> None:
        if not filename or Path(filename).suffix.lower() != ".pdf":
            raise UploadValidationError("Only files with a .pdf extension can be uploaded.")
