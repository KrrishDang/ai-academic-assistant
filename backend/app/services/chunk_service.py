"""Document text chunking and segmentation service."""

class ChunkService:
    """Service responsible for segmenting large text blocks into overlapping, size-bounded chunks."""

    def __init__(self, chunk_size: int = 40000, overlap: int = 2000) -> None:
        self._chunk_size = chunk_size
        self._overlap = overlap

    def chunk_text(self, text: str) -> list[str]:
        """Split the text input into chunks based on configured character size and overlap values."""
        if len(text) <= self._chunk_size:
            return [text]

        chunks = []
        start = 0
        while start < len(text):
            end = start + self._chunk_size
            if end < len(text):
                # Attempt to find a paragraph or line break to split cleanly near the end
                idx = text.rfind("\n", end - self._overlap, end)
                if idx != -1:
                    end = idx + 1
            chunks.append(text[start:end])
            start = end - self._overlap
            if start >= len(text) or end >= len(text):
                break
        return chunks
