"""Document text extraction and cleaning service."""

from pathlib import Path
from app.services.pdf_service import PdfService, PdfProcessingError

class ExtractionValidationError(ValueError):
    """Raised when text content fails extraction validation."""
    pass

class ExtractionService:
    """Service responsible for extracting, cleaning, and validating text from PDF documents."""

    def __init__(self, max_pages: int = 500):
        self._pdf_service = PdfService(max_pages=max_pages)

    def extract_and_clean_text(self, pdf_path: Path) -> str:
        """Extract text from the PDF path, scrub NULL characters, clean formatting, and validate results."""
        try:
            extraction = self._pdf_service.extract_text(pdf_path)
            raw_text = extraction.text or ""
            
            # Scrub null bytes to prevent database/JSON encoding crashes
            cleaned = raw_text.replace("\x00", "").strip()
            
            if not cleaned:
                raise ExtractionValidationError("The document does not contain any readable text.")
                
            return cleaned
        except PdfProcessingError as err:
            raise ExtractionValidationError(str(err)) from err
