"""Asynchronous Google Gemini API communication service."""

import asyncio
import logging
import random
import time
from collections.abc import AsyncIterator

import httpx
from google import genai
from google.genai import types
from google.genai.errors import APIError

from app.core.config import Settings

logger = logging.getLogger(__name__)


class GeminiServiceError(RuntimeError):
    """Base error for Gemini service failures safe to expose to API layers."""
    pass


class GeminiConfigurationError(GeminiServiceError):
    """Raised when a Gemini request is attempted without required configuration."""
    pass


class GeminiStreamError(GeminiServiceError):
    """Raised when a Gemini stream cannot be started or completed."""
    pass


class GeminiService:
    """Service responsible for sending prompts and streaming responses from Google's Gemini models."""

    def __init__(self, settings: Settings) -> None:
        api_key = settings.google_api_key.get_secret_value() if settings.google_api_key else None
        if not api_key:
            raise GeminiConfigurationError("GOOGLE_API_KEY is not configured.")

        # Initialize Google Gen AI client with timeout configurations
        self._client = genai.Client(
            api_key=api_key
        )
        self._model = settings.gemini_model
        self._max_retries = settings.gemini_max_retries

    async def stream_text(self, *, instructions: str, input_text: str) -> AsyncIterator[str]:
        """Yield text deltas for a single text block, handling retry policies and fallbacks."""
        logger.info(
            "Starting Gemini stream connection. Model: %s, Text Length: %d characters",
            self._model,
            len(input_text),
        )
        async for delta in self._stream_chunk(instructions=instructions, chunk_text=input_text):
            yield delta

    async def stream_chat(
        self,
        *,
        system_instruction: str,
        contents: list[types.Content],
        model: str | None = None,
        temperature: float | None = None,
    ) -> AsyncIterator[str]:
        """Stream a chat conversation response through Gemini."""
        model_name = model if model else self._model
        config_params = {"system_instruction": system_instruction}
        if temperature is not None:
            config_params["temperature"] = temperature
        config = types.GenerateContentConfig(**config_params)

        logger.info(
            "Starting Gemini chat stream. Model: %s, Messages count: %d, Temperature: %s",
            model_name,
            len(contents),
            temperature
        )

        start_time = time.time()
        try:
            stream = await self._client.aio.models.generate_content_stream(
                model=model_name,
                contents=contents,
                config=config,
            )
            async for chunk in stream:
                delta = chunk.text
                if delta:
                    yield delta
            logger.info("Completed Gemini chat stream in %.2f seconds.", time.time() - start_time)
        except Exception as error:
            logger.exception("Gemini chat stream failed.")
            raise GeminiStreamError("The chat assistant is temporarily unavailable.") from error

    async def _stream_chunk(self, *, instructions: str, chunk_text: str) -> AsyncIterator[str]:
        """Yield text deltas for a single chunk, retrying transient failures."""
        emitted_output = False

        for attempt in range(self._max_retries + 1):
            try:
                logger.debug("Gemini _stream_chunk: Attempt %d of %d starting API call", attempt + 1, self._max_retries + 1)
                config = types.GenerateContentConfig(
                    system_instruction=instructions
                )

                stream = await self._client.aio.models.generate_content_stream(
                    model=self._model,
                    contents=chunk_text,
                    config=config,
                )

                async for chunk in stream:
                    delta = chunk.text
                    if delta:
                        emitted_output = True
                        yield delta
                logger.debug("Gemini _stream_chunk: Chunk generation finished successfully on attempt %d", attempt + 1)
                return
            except Exception as error:
                logger.debug("Gemini _stream_chunk: Exception caught on attempt %d: %s", attempt + 1, type(error).__name__)
                
                # Attempt non-streaming fallback if streaming fails before producing output
                if not emitted_output:
                    logger.warning("Streaming failed or timed out. Attempting non-streaming fallback...")
                    try:
                        response = await self._client.aio.models.generate_content(
                            model=self._model,
                            contents=chunk_text,
                            config=config,
                        )
                        if response.text:
                            yield response.text
                            logger.debug("Gemini _stream_chunk: Fallback generation finished successfully")
                            return
                    except Exception as fallback_error:
                        logger.exception("Non-streaming fallback also failed: %s", fallback_error)

                # Raise error if retry is not possible or exhausted
                if emitted_output or not self._is_retryable(error) or attempt >= self._max_retries:
                    logger.exception("Gemini response stream failed.")
                    raise GeminiStreamError("The AI service is temporarily unavailable.") from error

                delay_seconds = self._retry_delay(attempt)
                logger.debug("Gemini _stream_chunk: Retry check passed. Retrying in %.2f seconds", delay_seconds)
                logger.warning(
                    "Transient Gemini failure; retrying request (attempt %s of %s) in %.2f seconds.",
                    attempt + 1,
                    self._max_retries,
                    delay_seconds,
                )
                await asyncio.sleep(delay_seconds)

        raise GeminiStreamError("The AI service is temporarily unavailable.")

    @staticmethod
    def _is_retryable(error: Exception) -> bool:
        """Return whether retrying this SDK error is safe before stream output begins."""
        if isinstance(error, APIError):
            return error.code == 429 or (error.code is not None and error.code >= 500)
        return isinstance(error, (httpx.RequestError, httpx.TimeoutException))

    @staticmethod
    def _retry_delay(attempt: int) -> float:
        """Use capped exponential backoff with jitter to avoid retry bursts."""
        return min(8.0, 0.5 * (2**attempt)) + random.uniform(0, 0.25)
