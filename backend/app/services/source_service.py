"""Source ingestion, validation, text extraction, and storage orchestration for StudyHub V2."""

import hashlib
import logging
import tempfile
import uuid
import xml.etree.ElementTree as ET
import zipfile
from dataclasses import dataclass
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models.notebook import Notebook
from app.models.source import Source
from app.services.pdf_service import PdfProcessingError, PdfService
from app.services.storage_service import create_document_storage

logger = logging.getLogger(__name__)

READ_CHUNK_SIZE = 1024 * 1024  # 1MB
PDF_MAGIC = b"%PDF-"
ZIP_MAGIC = b"PK\x03\x04"

DOCX_NAMESPACE = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
PPTX_DRAWING_NAMESPACE = "{http://schemas.openxmlformats.org/drawingml/2006/main}"


class SourceValidationError(ValueError):
    """Raised when an uploaded file violates the source validation policy."""


class SourceProcessingError(ValueError):
    """Raised when text extraction or processing fails."""


@dataclass(frozen=True)
class StagedSource:
    """A validated source staged temporarily on disk for processing."""

    path: Path
    filename: str
    extension: str
    mime_type: str
    size_bytes: int
    content_hash: str


class SourceService:
    """Coordinates validation, extraction, storage, and persistence of notebook sources."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._pdf_service = PdfService(max_pages=settings.max_pdf_pages)
        self._storage = create_document_storage(settings)

    async def ingest_source(
        self,
        notebook: Notebook,
        file: UploadFile,
        db: Session,
    ) -> Source:
        """Validate, extract, store, and record a new notebook source."""
        staged = await self._stage_and_validate(file)
        source_id = uuid.uuid4()
        storage_key = f"sources/{source_id}/{staged.filename}"

        extracted_text: str | None = None
        processing_status = "completed"
        error_message: str | None = None

        try:
            extracted_text = self._extract_text(staged)
            if not extracted_text:
                processing_status = "failed"
                error_message = "No readable text could be extracted from this document."
        except SourceProcessingError as err:
            logger.warning("Extraction failed for source %s: %s", staged.filename, err)
            processing_status = "failed"
            error_message = str(err)
        except Exception:
            logger.exception("Unexpected error during text extraction for %s", staged.filename)
            processing_status = "failed"
            error_message = "Document text extraction failed due to an internal error."

        # Save physical file to storage
        try:
            self._storage.save(staged.path, storage_key)
        except Exception as storage_err:
            logger.exception("Storage failed for source %s", staged.filename)
            staged.path.unlink(missing_ok=True)
            raise SourceValidationError("Failed to persist uploaded document.") from storage_err

        # Create database record
        source_record = Source(
            id=source_id,
            notebook_id=notebook.id,
            source_type="file",
            original_filename=staged.filename,
            display_title=Path(staged.filename).stem or staged.filename,
            mime_type=staged.mime_type,
            file_size_bytes=staged.size_bytes,
            content_hash=staged.content_hash,
            processing_status=processing_status,
            error_message=error_message,
            storage_key=storage_key,
            extracted_text=extracted_text,
        )

        try:
            db.add(source_record)
            db.commit()
            db.refresh(source_record)
        except Exception:
            logger.exception("Database transaction failed for source %s. Rolling back storage.", staged.filename)
            self._storage.delete(storage_key)
            db.rollback()
            raise
        finally:
            staged.path.unlink(missing_ok=True)

        logger.info(
            "Source ingested successfully. ID: %s, Notebook: %s, Status: %s, Size: %d bytes",
            source_id,
            notebook.id,
            processing_status,
            staged.size_bytes,
        )
        return source_record

    def delete_source(self, source: Source, db: Session) -> None:
        """Delete source physical storage and database record."""
        if source.storage_key:
            try:
                self._storage.delete(source.storage_key)
            except Exception:
                logger.warning("Could not delete stored file %s, proceeding with DB removal", source.storage_key)

        db.delete(source)
        db.commit()

    async def _stage_and_validate(self, file: UploadFile) -> StagedSource:
        """Stage file to disk and perform extension, size, empty, and magic byte validation."""
        raw_filename = file.filename or ""
        safe_filename = Path(raw_filename).name.strip()
        if not safe_filename:
            raise SourceValidationError("A valid filename is required.")

        extension = Path(safe_filename).suffix.lower()
        allowed_extensions = {".pdf", ".docx", ".pptx", ".txt"}
        if extension not in allowed_extensions:
            raise SourceValidationError(
                f"Unsupported file format '{extension}'. Supported formats are: PDF, DOCX, PPTX, TXT."
            )

        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=extension)
        temp_path = Path(temp_file.name)
        size_bytes = 0
        sha256_hash = hashlib.sha256()
        header = b""

        try:
            with temp_file:
                while chunk := await file.read(READ_CHUNK_SIZE):
                    size_bytes += len(chunk)
                    if size_bytes > self._settings.max_upload_size_bytes:
                        limit_mb = self._settings.max_upload_size_bytes // (1024 * 1024)
                        raise SourceValidationError(f"File size exceeds the maximum limit of {limit_mb} MB.")
                    if len(header) < 16:
                        header += chunk[: 16 - len(header)]
                    sha256_hash.update(chunk)
                    temp_file.write(chunk)

            if size_bytes == 0:
                raise SourceValidationError("The uploaded file is empty.")

            detected_mime = self._validate_content_type_and_magic(extension, header, temp_path)

            return StagedSource(
                path=temp_path,
                filename=safe_filename,
                extension=extension,
                mime_type=detected_mime,
                size_bytes=size_bytes,
                content_hash=sha256_hash.hexdigest(),
            )
        except Exception:
            temp_path.unlink(missing_ok=True)
            raise
        finally:
            await file.close()

    def _validate_content_type_and_magic(self, extension: str, header: bytes, path: Path) -> str:
        """Validate that file content magic bytes match the stated extension."""
        if extension == ".pdf":
            if not header.startswith(PDF_MAGIC):
                raise SourceValidationError("The file content does not match a valid PDF signature.")
            return "application/pdf"

        if extension == ".docx":
            if not header.startswith(ZIP_MAGIC):
                raise SourceValidationError("The file content does not match a valid DOCX signature.")
            try:
                with zipfile.ZipFile(path, "r") as z:
                    if "word/document.xml" not in z.namelist():
                        raise SourceValidationError("The file is not a valid DOCX document.")
            except zipfile.BadZipFile as err:
                raise SourceValidationError("The DOCX file is corrupt or invalid.") from err
            return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

        if extension == ".pptx":
            if not header.startswith(ZIP_MAGIC):
                raise SourceValidationError("The file content does not match a valid PPTX signature.")
            try:
                with zipfile.ZipFile(path, "r") as z:
                    has_ppt = any(name.startswith("ppt/") for name in z.namelist())
                    if not has_ppt:
                        raise SourceValidationError("The file is not a valid PPTX presentation.")
            except zipfile.BadZipFile as err:
                raise SourceValidationError("The PPTX file is corrupt or invalid.") from err
            return "application/vnd.openxmlformats-officedocument.presentationml.presentation"

        if extension == ".txt":
            # Ensure text is not binary executable
            if b"\x00" in header:
                raise SourceValidationError("Binary files cannot be uploaded as text.")
            return "text/plain"

        raise SourceValidationError(f"Unsupported extension {extension}")

    def _extract_text(self, staged: StagedSource) -> str:
        """Dispatch text extraction based on file format."""
        if staged.extension == ".pdf":
            try:
                extracted = self._pdf_service.extract_text(staged.path)
                return extracted.text.replace("\x00", "").strip()
            except PdfProcessingError as err:
                raise SourceProcessingError(str(err)) from err

        if staged.extension == ".docx":
            return self._extract_docx(staged.path)

        if staged.extension == ".pptx":
            return self._extract_pptx(staged.path)

        if staged.extension == ".txt":
            return self._extract_txt(staged.path)

        raise SourceProcessingError(f"No extractor available for format {staged.extension}")

    def _extract_docx(self, path: Path) -> str:
        """Extract paragraph text from a Word DOCX file using standard library xml parser."""
        try:
            with zipfile.ZipFile(path, "r") as z:
                xml_data = z.read("word/document.xml")
            tree = ET.fromstring(xml_data)
            paragraphs: list[str] = []
            for p in tree.iter(f"{DOCX_NAMESPACE}p"):
                texts = [
                    node.text
                    for node in p.iter(f"{DOCX_NAMESPACE}t")
                    if node.text
                ]
                if texts:
                    paragraphs.append("".join(texts))
            cleaned = "\n\n".join(p.strip() for p in paragraphs if p.strip()).replace("\x00", "").strip()
            if not cleaned:
                raise SourceProcessingError("No readable text found in DOCX file.")
            return cleaned
        except SourceProcessingError:
            raise
        except Exception as err:
            raise SourceProcessingError("Failed to parse DOCX document structure.") from err

    def _extract_pptx(self, path: Path) -> str:
        """Extract slide text from a PowerPoint PPTX file using standard library xml parser."""
        try:
            with zipfile.ZipFile(path, "r") as z:
                slide_files = sorted(
                    [name for name in z.namelist() if name.startswith("ppt/slides/slide") and name.endswith(".xml")],
                    key=lambda n: int("".join(filter(str.isdigit, n)) or 0),
                )
                if not slide_files:
                    raise SourceProcessingError("No slides found in PPTX presentation.")

                slides_text: list[str] = []
                for s_file in slide_files:
                    slide_xml = z.read(s_file)
                    tree = ET.fromstring(slide_xml)
                    slide_elements = [
                        node.text
                        for node in tree.iter(f"{PPTX_DRAWING_NAMESPACE}t")
                        if node.text and node.text.strip()
                    ]
                    if slide_elements:
                        slides_text.append("\n".join(slide_elements))

            cleaned = "\n\n---\n\n".join(s.strip() for s in slides_text if s.strip()).replace("\x00", "").strip()
            if not cleaned:
                raise SourceProcessingError("No readable text found in PPTX presentation slides.")
            return cleaned
        except SourceProcessingError:
            raise
        except Exception as err:
            raise SourceProcessingError("Failed to parse PPTX presentation structure.") from err

    def _extract_txt(self, path: Path) -> str:
        """Extract text from a plain text file handling multiple encodings."""
        content: str | None = None
        for encoding in ("utf-8", "utf-8-sig", "latin-1"):
            try:
                content = path.read_text(encoding=encoding)
                break
            except UnicodeDecodeError:
                continue

        if content is None:
            raise SourceProcessingError("Text file encoding could not be determined.")

        cleaned = content.replace("\x00", "").strip()
        if not cleaned:
            raise SourceProcessingError("The text file contains no readable text.")
        return cleaned
