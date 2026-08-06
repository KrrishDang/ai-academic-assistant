"""Comprehensive backend unit tests for generation, prompt service, and schemas."""

import unittest
from unittest.mock import MagicMock
from app.services.prompt_service import PromptService
from app.services.gemini_service import GeminiService, GeminiServiceError
from app.schemas.document import NotesGenerationRequest
from google.genai.errors import APIError
import httpx


class TestPromptService(unittest.TestCase):
    """Test prompt builder service."""

    def setUp(self):
        self.prompt_service = PromptService()

    def test_build_notes_prompt(self):
        prompt = self.prompt_service.build_notes_prompt()
        self.assertIn("Content Scope", prompt)
        self.assertIn("Key Concepts", prompt)

    def test_build_mcq_prompt(self):
        prompt = self.prompt_service.build_mcq_prompt()
        self.assertIn("metadata", prompt)
        self.assertIn("questions", prompt)

    def test_build_viva_prompt(self):
        prompt = self.prompt_service.build_viva_prompt()
        self.assertIn("metadata", prompt)
        self.assertIn("expectedAnswer", prompt)

    def test_build_flashcards_prompt(self):
        prompt = self.prompt_service.build_flashcards_prompt()
        self.assertIn("flashcards", prompt)


class TestGeminiServiceErrors(unittest.TestCase):
    """Test actionable error message formatting."""

    def test_rate_limit_error_formatting(self):
        err = APIError(429, MagicMock(), {"error": {"message": "Rate limit exceeded"}})
        msg = GeminiService._format_actionable_error(err)
        self.assertIn("rate limit reached (429)", msg)

    def test_auth_error_formatting(self):
        err = APIError(401, MagicMock(), {"error": {"message": "Unauthorized"}})
        msg = GeminiService._format_actionable_error(err)
        self.assertIn("invalid or unauthorized", msg)

    def test_server_error_formatting(self):
        err = APIError(500, MagicMock(), {"error": {"message": "Internal error"}})
        msg = GeminiService._format_actionable_error(err)
        self.assertIn("temporary error (500)", msg)

    def test_timeout_error_formatting(self):
        err = httpx.TimeoutException("Timeout")
        msg = GeminiService._format_actionable_error(err)
        self.assertIn("timed out", msg)

    def test_network_error_formatting(self):
        err = httpx.RequestError("Network fail")
        msg = GeminiService._format_actionable_error(err)
        self.assertIn("Network connection error", msg)


class TestSchemas(unittest.TestCase):
    """Test Pydantic schemas validation."""

    def test_notes_generation_request(self):
        req = NotesGenerationRequest(extracted_text="Sample text for testing")
        self.assertEqual(req.extracted_text, "Sample text for testing")


if __name__ == "__main__":
    unittest.main()
