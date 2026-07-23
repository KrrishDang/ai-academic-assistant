"""Generation pipeline orchestrator service."""

from collections.abc import AsyncIterator

from app.services.prompt_service import PromptService
from app.services.gemini_service import GeminiService
from app.services.chunk_service import ChunkService

class GenerationService:
    """Orchestrator responsible for coordinating document text, prompts, and Gemini execution pipelines."""

    def __init__(self, gemini_service: GeminiService):
        self._gemini_service = gemini_service
        self._prompt_service = PromptService()
        self._chunk_service = ChunkService()

    async def stream_study_notes(self, extracted_text: str) -> AsyncIterator[str]:
        """Orchestrate study notes generation for document text, chunking and streaming outputs."""
        instructions = self._prompt_service.build_notes_prompt()
        return self._orchestrate_stream(instructions, extracted_text)

    async def stream_mcqs(self, extracted_text: str) -> AsyncIterator[str]:
        """Orchestrate multiple-choice question generation for document text."""
        instructions = self._prompt_service.build_mcq_prompt()
        return self._orchestrate_stream(instructions, extracted_text)

    async def stream_viva_questions(self, extracted_text: str) -> AsyncIterator[str]:
        """Orchestrate viva exam preparation questions for document text."""
        instructions = self._prompt_service.build_viva_prompt()
        return self._orchestrate_stream(instructions, extracted_text)

    async def stream_five_mark_answer(self, extracted_text: str) -> AsyncIterator[str]:
        """Orchestrate a short-form exam response for document text."""
        instructions = self._prompt_service.build_five_mark_prompt()
        return self._orchestrate_stream(instructions, extracted_text)

    async def stream_ten_mark_answer(self, extracted_text: str) -> AsyncIterator[str]:
        """Orchestrate a detailed, long-form essay response for document text."""
        instructions = self._prompt_service.build_ten_mark_prompt()
        return self._orchestrate_stream(instructions, extracted_text)

    async def stream_simple_explanation(self, extracted_text: str) -> AsyncIterator[str]:
        """Orchestrate a beginner-friendly simple explanation for document text."""
        instructions = self._prompt_service.build_simple_prompt()
        return self._orchestrate_stream(instructions, extracted_text)

    async def stream_flashcards(self, extracted_text: str) -> AsyncIterator[str]:
        """Orchestrate study flashcards generation for document text."""
        instructions = self._prompt_service.build_flashcards_prompt()
        return self._orchestrate_stream(instructions, extracted_text)

    async def stream_summary(self, extracted_text: str) -> AsyncIterator[str]:
        """Orchestrate study summary generation for document text."""
        instructions = self._prompt_service.build_summary_prompt()
        return self._orchestrate_stream(instructions, extracted_text)

    async def _orchestrate_stream(self, instructions: str, extracted_text: str) -> AsyncIterator[str]:
        """Divide the extracted text, formatting transitions, and streaming sections via Gemini."""
        chunks = self._chunk_service.chunk_text(extracted_text)
        num_chunks = len(chunks)

        for idx, chunk in enumerate(chunks):
            if num_chunks > 1:
                # Yield transition header between segments
                yield f"\n\n---\n### Section {idx + 1} of {num_chunks}\n\n"

            async for delta in self._gemini_service.stream_text(
                instructions=instructions,
                input_text=chunk
            ):
                yield delta

    async def stream_chat(
        self,
        *,
        messages: list,
        doc_filename: str | None = None,
        doc_text: str | None = None,
        model: str | None = None,
        temperature: float | None = None,
    ) -> AsyncIterator[str]:
        """Orchestrate dynamic chat streaming by building system instructions and message history."""
        from google.genai import types
        
        trimmed = self._trim_conversation_history(messages)
        
        gemini_contents = []
        for msg in trimmed:
            gemini_contents.append(
                types.Content(
                    role="user" if msg.role == "user" else "model",
                    parts=[types.Part.from_text(text=msg.content)]
                )
            )

        system_instruction = self._prompt_service.build_chat_system_instruction(doc_filename, doc_text)

        async for delta in self._gemini_service.stream_chat(
            system_instruction=system_instruction,
            contents=gemini_contents,
            model=model,
            temperature=temperature,
        ):
            yield delta

    def _trim_conversation_history(self, messages: list, max_chars: int = 60_000) -> list:
        """Trim conversation history to fit within a character limit, preserving message turns in pairs."""
        total_chars = sum(len(msg.content) for msg in messages)
        if total_chars <= max_chars:
            return messages

        trimmed = list(messages)
        while len(trimmed) > 1 and sum(len(m.content) for m in trimmed) > max_chars:
            trimmed.pop(0)

        while trimmed and trimmed[0].role == "assistant":
            trimmed.pop(0)

        return trimmed

