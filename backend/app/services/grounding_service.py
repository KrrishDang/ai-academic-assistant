"""Notebook-scoped document grounding and retrieval service."""

from __future__ import annotations

import logging
import re
import uuid
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models.notebook import Notebook
from app.models.source import Source

logger = logging.getLogger(__name__)

STOPWORDS = frozenset({
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
    "aren't", "as", "at", "be", "because", "been", "before", "being", "below", "between", "both",
    "but", "by", "can", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does",
    "doesn't", "doing", "don't", "down", "during", "each", "few", "for", "from", "further", "had",
    "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "her", "here", "hers", "herself",
    "him", "himself", "his", "how", "i", "if", "in", "into", "is", "isn't", "it", "it's", "its",
    "itself", "just", "me", "more", "most", "my", "myself", "no", "nor", "not", "now", "of", "off",
    "on", "once", "only", "or", "other", "our", "ours", "ourselves", "out", "over", "own", "same",
    "she", "should", "shouldn't", "so", "some", "such", "than", "that", "the", "their", "theirs",
    "them", "themselves", "then", "there", "these", "they", "this", "those", "through", "to", "too",
    "under", "until", "up", "very", "was", "wasn't", "we", "were", "weren't", "what", "when",
    "where", "which", "while", "who", "whom", "why", "with", "won't", "would", "wouldn't", "you",
    "your", "yours", "yourself", "yourselves",
})


@dataclass
class SourceChunk:
    """Represents a bounded segment of an ingested source document."""

    source_id: uuid.UUID
    display_title: str
    chunk_index: int
    text: str
    section_hint: str | None = None
    char_count: int = 0

    def __post_init__(self) -> None:
        self.char_count = len(self.text)


class GroundingService:
    """Service responsible for notebook source retrieval, semantic chunking, and grounding assembly."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._chunk_size = settings.grounding_chunk_size
        self._chunk_overlap = settings.grounding_chunk_overlap
        self._max_context_chars = settings.grounding_max_context_chars

    def build_grounding_context(
        self,
        *,
        notebook_id: uuid.UUID,
        user_id: uuid.UUID,
        query: str,
        db: Session,
    ) -> tuple[str, list[dict[str, Any]]]:
        """Retrieve completed sources for the authorized notebook, rank chunks by query relevance, and format context."""
        # 1. Enforce notebook ownership
        notebook = db.scalar(
            select(Notebook).where(
                Notebook.id == notebook_id,
                Notebook.user_id == user_id,
            )
        )
        if not notebook:
            logger.warning(
                "Access denied or notebook not found for grounding: notebook_id=%s, user_id=%s",
                notebook_id,
                user_id,
            )
            raise ValueError("Notebook not found or not owned by user.")

        # 2. Retrieve only completed sources belonging to this notebook
        sources = db.scalars(
            select(Source)
            .where(
                Source.notebook_id == notebook_id,
                Source.processing_status == "completed",
            )
            .order_by(Source.created_at.asc())
        ).all()

        # Filter out empty or whitespace-only sources
        valid_sources = [s for s in sources if s.extracted_text and s.extracted_text.strip()]
        if not valid_sources:
            logger.info("No completed sources with readable text found for notebook %s", notebook_id)
            return "", []

        # 3. Chunk each source into manageable, sentence-bounded overlapping segments
        all_chunks: list[SourceChunk] = []
        for source in valid_sources:
            chunks = self._chunk_source(source)
            all_chunks.extend(chunks)

        if not all_chunks:
            return "", []

        # 4. Rank chunks by relevance to the user's query
        ranked_chunks = self._rank_chunks(all_chunks, query)

        # 5. Select non-duplicate chunks within the context token/character budget
        selected_chunks = self._budget_chunks(ranked_chunks)

        # 6. Format grounding context with prompt injection protection and build structured citations
        formatted_context, citations = self._format_context_and_citations(selected_chunks)

        logger.info(
            "Built grounding context for notebook %s: %d sources, %d total chunks, %d selected, %d chars",
            notebook_id,
            len(valid_sources),
            len(all_chunks),
            len(selected_chunks),
            len(formatted_context),
        )

        return formatted_context, citations

    def _chunk_source(self, source: Source) -> list[SourceChunk]:
        """Split a source's extracted text into overlapping, sentence-aware chunks."""
        text = source.extracted_text or ""
        source_id = source.id
        title = source.display_title or source.original_filename or "Untitled Source"

        # Check for slide boundaries (from PPTX extraction)
        if "\n\n---\n\n" in text:
            slides = [s.strip() for s in text.split("\n\n---\n\n") if s.strip()]
            slide_chunks: list[SourceChunk] = []
            chunk_idx = 0
            for slide_num, slide_text in enumerate(slides, start=1):
                section_label = f"Slide {slide_num}"
                if len(slide_text) <= self._chunk_size:
                    slide_chunks.append(
                        SourceChunk(
                            source_id=source_id,
                            display_title=title,
                            chunk_index=chunk_idx,
                            text=slide_text,
                            section_hint=section_label,
                        )
                    )
                    chunk_idx += 1
                else:
                    # Slide text exceeds chunk size, subdivide with sentence awareness
                    sub_chunks = self._subdivide_text(
                        slide_text,
                        source_id=source_id,
                        title=title,
                        start_idx=chunk_idx,
                        section_hint=section_label,
                    )
                    slide_chunks.extend(sub_chunks)
                    chunk_idx += len(sub_chunks)
            return slide_chunks

        # Standard document text (PDF, DOCX, TXT)
        return self._subdivide_text(
            text,
            source_id=source_id,
            title=title,
            start_idx=0,
            section_hint=None,
        )

    def _subdivide_text(
        self,
        text: str,
        *,
        source_id: uuid.UUID,
        title: str,
        start_idx: int,
        section_hint: str | None,
    ) -> list[SourceChunk]:
        """Subdivide long continuous text using sentence boundaries and overlapping windows."""
        chunks: list[SourceChunk] = []
        text_len = len(text)
        if text_len <= self._chunk_size:
            return [
                SourceChunk(
                    source_id=source_id,
                    display_title=title,
                    chunk_index=start_idx,
                    text=text.strip(),
                    section_hint=section_hint,
                )
            ]

        start = 0
        idx = start_idx
        while start < text_len:
            end = start + self._chunk_size
            if end >= text_len:
                chunk_slice = text[start:].strip()
                if chunk_slice:
                    chunks.append(
                        SourceChunk(
                            source_id=source_id,
                            display_title=title,
                            chunk_index=idx,
                            text=chunk_slice,
                            section_hint=section_hint,
                        )
                    )
                break

            # Find a clean boundary in the overlap margin [end - overlap, end]
            search_window = text[end - self._chunk_overlap : end]
            # Prioritize paragraph break, then sentence break, then line break, then space
            boundary = -1
            for separator in ("\n\n", ".\n", ". ", "?\n", "? ", "!\n", "! ", "\n", " "):
                pos = search_window.rfind(separator)
                if pos != -1:
                    boundary = (end - self._chunk_overlap) + pos + len(separator)
                    break

            if boundary != -1 and boundary > start:
                chunk_end = boundary
            else:
                chunk_end = end

            chunk_slice = text[start:chunk_end].strip()
            if chunk_slice:
                chunks.append(
                    SourceChunk(
                        source_id=source_id,
                        display_title=title,
                        chunk_index=idx,
                        text=chunk_slice,
                        section_hint=section_hint,
                    )
                )
                idx += 1

            start = chunk_end - self._chunk_overlap
            if start >= text_len or chunk_end >= text_len:
                break

        return chunks

    def _rank_chunks(self, chunks: list[SourceChunk], query: str) -> list[SourceChunk]:
        """Score and sort chunks using lexical keyword relevance (TF-IDF coverage principles)."""
        raw_tokens = re.findall(r"\b[a-zA-Z0-9_\-\.]{2,}\b", query.lower())
        query_terms = [t for t in raw_tokens if t not in STOPWORDS]

        if not query_terms:
            # Query contains no informative keywords (e.g., "Hi", "Summarize everything")
            # Return chunks preserving document balance via round-robin interleaving
            return self._interleave_chunks(chunks)

        scored_chunks: list[tuple[float, SourceChunk]] = []
        normalized_query = " ".join(query_terms)

        for chunk in chunks:
            chunk_text_lower = chunk.text.lower()
            score = 0.0

            matched_terms_count = 0
            for term in query_terms:
                term_occurrences = chunk_text_lower.count(term)
                if term_occurrences > 0:
                    matched_terms_count += 1
                    # Log-damped term frequency
                    score += 1.0 + (term_occurrences - 1) * 0.2

            # Query term coverage multiplier: rewarding chunks matching multiple distinct terms
            if matched_terms_count > 0:
                coverage_ratio = matched_terms_count / len(query_terms)
                score *= 1.0 + (coverage_ratio * 2.0)

            # Exact phrase match bonus
            if normalized_query in chunk_text_lower or query.strip().lower() in chunk_text_lower:
                score += 8.0

            # Title match bonus
            title_lower = chunk.display_title.lower()
            for term in query_terms:
                if term in title_lower:
                    score += 1.5

            scored_chunks.append((score, chunk))

        # Check if any chunk had positive matches
        max_score = max(s[0] for s in scored_chunks) if scored_chunks else 0.0
        if max_score <= 0.0:
            return self._interleave_chunks(chunks)

        # Sort descending by score
        scored_chunks.sort(key=lambda item: item[0], reverse=True)
        return [item[1] for item in scored_chunks]

    @staticmethod
    def _interleave_chunks(chunks: list[SourceChunk]) -> list[SourceChunk]:
        """Interleave chunks across all available sources to provide balanced coverage."""
        by_source: dict[uuid.UUID, list[SourceChunk]] = {}
        for c in chunks:
            by_source.setdefault(c.source_id, []).append(c)

        interleaved: list[SourceChunk] = []
        max_len = max((len(lst) for lst in by_source.values()), default=0)
        source_lists = list(by_source.values())

        for i in range(max_len):
            for s_list in source_lists:
                if i < len(s_list):
                    interleaved.append(s_list[i])

        return interleaved

    def _budget_chunks(self, chunks: list[SourceChunk]) -> list[SourceChunk]:
        """Select top-ranked unique chunks while strictly respecting the maximum character budget."""
        selected: list[SourceChunk] = []
        current_chars = 0
        seen_texts: set[str] = set()

        for chunk in chunks:
            # Deduplicate near-identical chunk texts
            content_snippet = chunk.text[:120].strip()
            if content_snippet in seen_texts:
                continue

            chunk_len = len(chunk.text)
            if current_chars + chunk_len > self._max_context_chars:
                # If we haven't selected anything yet, at least take the first chunk up to budget
                if not selected and chunk_len > self._max_context_chars:
                    truncated_chunk = SourceChunk(
                        source_id=chunk.source_id,
                        display_title=chunk.display_title,
                        chunk_index=chunk.chunk_index,
                        text=chunk.text[: self._max_context_chars],
                        section_hint=chunk.section_hint,
                    )
                    selected.append(truncated_chunk)
                break

            selected.append(chunk)
            seen_texts.add(content_snippet)
            current_chars += chunk_len

        return selected

    @staticmethod
    def _format_context_and_citations(
        chunks: list[SourceChunk],
    ) -> tuple[str, list[dict[str, Any]]]:
        """Format XML-enclosed context chunks and collect structured citation metadata."""
        if not chunks:
            return "", []

        formatted_blocks: list[str] = []
        citations: list[dict[str, Any]] = []
        seen_citation_keys: set[str] = set()

        for chunk in chunks:
            # Prompt injection defense: sanitize any adversarial closing XML tags
            sanitized_text = (
                chunk.text.replace("<grounding_context>", "")
                .replace("</grounding_context>", "")
                .replace("<source", "&lt;source")
                .replace("</source>", "&lt;/source&gt;")
            )

            section_attr = f' section="{chunk.section_hint}"' if chunk.section_hint else ""
            block = (
                f'<source id="{chunk.source_id}" title="{chunk.display_title}" '
                f'chunk="{chunk.chunk_index}"{section_attr}>\n'
                f"{sanitized_text}\n"
                f"</source>"
            )
            formatted_blocks.append(block)

            # Build structured citation
            citation_key = f"{chunk.source_id}_{chunk.section_hint}_{chunk.chunk_index}"
            if citation_key not in seen_citation_keys:
                citations.append({
                    "source_id": str(chunk.source_id),
                    "display_title": chunk.display_title,
                    "chunk_index": chunk.chunk_index,
                    "section": chunk.section_hint,
                })
                seen_citation_keys.add(citation_key)

        context_str = "\n\n".join(formatted_blocks)
        return context_str, citations
