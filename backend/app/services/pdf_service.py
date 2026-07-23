"""Safe PDF validation and text extraction."""

from dataclasses import dataclass
from pathlib import Path

import fitz


class PdfProcessingError(ValueError):
    """Raised when an uploaded file cannot be used as an academic PDF."""


@dataclass(frozen=True)
class ExtractedPdf:
    """Text and page metadata extracted from a PDF."""

    page_count: int
    text: str


class PdfService:
    """Extract selectable text from a validated PDF file."""

    def __init__(self, max_pages: int) -> None:
        self._max_pages = max_pages

    def extract_text(self, source_path: Path) -> ExtractedPdf:
        """Read PDF text while rejecting encrypted, damaged, and oversized documents."""
        try:
            with fitz.open(source_path) as pdf:
                if pdf.needs_pass:
                    raise PdfProcessingError("Password-protected PDFs are not supported.")

                page_count = pdf.page_count
                if page_count == 0:
                    raise PdfProcessingError("The PDF does not contain any pages.")
                if page_count > self._max_pages:
                    raise PdfProcessingError(
                        f"The PDF has too many pages. The limit is {self._max_pages} pages."
                    )

                pages = [page.get_text("text").strip() for page in pdf]
        except PdfProcessingError:
            raise
        except (fitz.FileDataError, RuntimeError, OSError) as error:
            raise PdfProcessingError("The uploaded file is not a readable PDF.") from error

        text = "\n\n".join(page for page in pages if page)
        if not text:
            raise PdfProcessingError(
                "No selectable text was found in this PDF. Upload a text-based PDF."
            )

        return ExtractedPdf(page_count=page_count, text=text)
