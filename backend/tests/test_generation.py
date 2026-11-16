"""Comprehensive backend unit tests for generation, prompt service, schemas, and JSON parsing."""

import unittest
from datetime import datetime, timezone
from unittest.mock import MagicMock, AsyncMock, patch
from app.services.prompt_service import PromptService
from app.services.gemini_service import GeminiService
from app.services.json_parser import (
    parse_and_validate_mcqs,
    parse_and_validate_viva,
    parse_and_validate_flashcards,
    repair_json_string,
)
from app.schemas.document import NotesGenerationRequest
from app.api.dashboard import _ensure_tz_aware
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


class TestJsonParser(unittest.TestCase):
    """Test JSON repair and validation parser."""

    def test_repair_json_string(self):
        raw = "```json\n{\"test\": 123,}\n```"
        repaired = repair_json_string(raw)
        self.assertEqual(repaired, "{\"test\": 123}")

    def test_parse_mcqs(self):
        raw = '{"metadata": {"title": "Quiz"}, "questions": [{"question": "What is Python?", "options": ["A", "B", "C", "D"], "correctAnswer": 0}]}'
        parsed = parse_and_validate_mcqs(raw)
        self.assertEqual(parsed.metadata.title, "Quiz")
        self.assertEqual(len(parsed.questions), 1)

    def test_parse_viva(self):
        raw = '{"metadata": {"title": "Viva Prep"}, "questions": [{"question": "Explain OOP?", "expectedAnswer": "Object Oriented Programming."}]}'
        parsed = parse_and_validate_viva(raw)
        self.assertEqual(parsed.metadata.title, "Viva Prep")
        self.assertEqual(len(parsed.questions), 1)

    def test_parse_flashcards(self):
        raw = '{"flashcards": [{"front": "Term", "back": "Definition"}]}'
        parsed = parse_and_validate_flashcards(raw)
        self.assertEqual(len(parsed.flashcards), 1)
        self.assertEqual(parsed.flashcards[0].front, "Term")


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


class TestDashboardStats(unittest.TestCase):
    """Test timezone normalization and dashboard helpers."""

    def test_ensure_tz_aware_none(self):
        dt = _ensure_tz_aware(None)
        self.assertIsNotNone(dt)
        self.assertEqual(dt.tzinfo, timezone.utc)

    def test_ensure_tz_aware_naive(self):
        naive = datetime(2026, 8, 20, 10, 0, 0)
        dt = _ensure_tz_aware(naive)
        self.assertEqual(dt.tzinfo, timezone.utc)


class TestSchemas(unittest.TestCase):
    """Test Pydantic schemas validation."""

    def test_notes_generation_request(self):
        req = NotesGenerationRequest(extracted_text="Sample text for testing")
        self.assertEqual(req.extracted_text, "Sample text for testing")

    def test_notes_generation_request_identifiers(self):
        import uuid
        test_source_id = uuid.uuid4()
        test_notebook_id = uuid.uuid4()
        req = NotesGenerationRequest(source_id=test_source_id, notebook_id=test_notebook_id)
        self.assertEqual(req.source_id, test_source_id)
        self.assertEqual(req.notebook_id, test_notebook_id)
        self.assertIsNone(req.extracted_text)


class TestResolveGenerationText(unittest.TestCase):
    """Test server-side source resolution and authorization boundaries."""

    def setUp(self):
        import uuid
        from app.models.user import User
        self.user = User(id=uuid.uuid4(), email="student@university.edu")
        self.mock_db = MagicMock()

    def test_resolve_with_extracted_text(self):
        from app.api.generation import _resolve_generation_text
        req = NotesGenerationRequest(extracted_text="Explicit source text for notes")
        text = _resolve_generation_text(req, self.user, self.mock_db)
        self.assertEqual(text, "Explicit source text for notes")

    def test_resolve_with_authorized_source_id(self):
        import uuid
        from app.api.generation import _resolve_generation_text
        from app.models.source import Source
        test_source_id = uuid.uuid4()
        mock_source = Source(
            id=test_source_id,
            display_title="Lecture 1.pdf",
            extracted_text="Server-side resolved lecture text.",
            processing_status="completed",
        )
        self.mock_db.scalar.return_value = mock_source
        req = NotesGenerationRequest(source_id=test_source_id)
        text = _resolve_generation_text(req, self.user, self.mock_db)
        self.assertEqual(text, "Server-side resolved lecture text.")

    def test_resolve_unauthorized_source_id_raises_404(self):
        import uuid
        from fastapi import HTTPException
        from app.api.generation import _resolve_generation_text
        self.mock_db.scalar.return_value = None
        req = NotesGenerationRequest(source_id=uuid.uuid4())
        with self.assertRaises(HTTPException) as ctx:
            _resolve_generation_text(req, self.user, self.mock_db)
        self.assertEqual(ctx.exception.status_code, 404)

    def test_resolve_unprocessed_source_raises_400(self):
        import uuid
        from fastapi import HTTPException
        from app.api.generation import _resolve_generation_text
        from app.models.source import Source
        test_source_id = uuid.uuid4()
        mock_source = Source(
            id=test_source_id,
            display_title="Lecture 1.pdf",
            extracted_text="Text in progress.",
            processing_status="processing",
        )
        self.mock_db.scalar.return_value = mock_source
        req = NotesGenerationRequest(source_id=test_source_id)
        with self.assertRaises(HTTPException) as ctx:
            _resolve_generation_text(req, self.user, self.mock_db)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("not completed", ctx.exception.detail)

    def test_resolve_empty_source_text_raises_400(self):
        import uuid
        from fastapi import HTTPException
        from app.api.generation import _resolve_generation_text
        from app.models.source import Source
        test_source_id = uuid.uuid4()
        mock_source = Source(
            id=test_source_id,
            display_title="Lecture 1.pdf",
            extracted_text="   ",
            processing_status="completed",
        )
        self.mock_db.scalar.return_value = mock_source
        req = NotesGenerationRequest(source_id=test_source_id)
        with self.assertRaises(HTTPException) as ctx:
            _resolve_generation_text(req, self.user, self.mock_db)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("No readable text", ctx.exception.detail)

    def test_resolve_source_budget_truncation(self):
        import uuid
        from app.api.generation import _resolve_generation_text, MAX_GENERATION_CHARS
        from app.models.source import Source
        test_source_id = uuid.uuid4()
        massive_text = "A" * (MAX_GENERATION_CHARS + 5000)
        mock_source = Source(
            id=test_source_id,
            display_title="Giant.pdf",
            extracted_text=massive_text,
            processing_status="completed",
        )
        self.mock_db.scalar.return_value = mock_source
        req = NotesGenerationRequest(source_id=test_source_id)
        text = _resolve_generation_text(req, self.user, self.mock_db)
        self.assertEqual(len(text), MAX_GENERATION_CHARS)

    def test_resolve_with_authorized_notebook_id(self):
        import uuid
        from app.api.generation import _resolve_generation_text
        from app.models.notebook import Notebook
        from app.models.source import Source
        test_notebook_id = uuid.uuid4()
        mock_notebook = Notebook(id=test_notebook_id, user_id=self.user.id)
        mock_source_1 = Source(id=uuid.uuid4(), extracted_text="Chapter 1 content.", processing_status="completed")
        mock_source_2 = Source(id=uuid.uuid4(), extracted_text="Chapter 2 content.", processing_status="completed")
        self.mock_db.scalar.return_value = mock_notebook
        self.mock_db.scalars.return_value.all.return_value = [mock_source_1, mock_source_2]
        req = NotesGenerationRequest(notebook_id=test_notebook_id)
        text = _resolve_generation_text(req, self.user, self.mock_db)
        self.assertIn("Chapter 1 content.", text)
        self.assertIn("Chapter 2 content.", text)
        self.assertIn("---", text)

    def test_resolve_unauthorized_notebook_id_raises_404(self):
        import uuid
        from fastapi import HTTPException
        from app.api.generation import _resolve_generation_text
        self.mock_db.scalar.return_value = None
        req = NotesGenerationRequest(notebook_id=uuid.uuid4())
        with self.assertRaises(HTTPException) as ctx:
            _resolve_generation_text(req, self.user, self.mock_db)
        self.assertEqual(ctx.exception.status_code, 404)

    def test_resolve_notebook_empty_sources_raises_400(self):
        import uuid
        from fastapi import HTTPException
        from app.api.generation import _resolve_generation_text
        from app.models.notebook import Notebook
        test_notebook_id = uuid.uuid4()
        mock_notebook = Notebook(id=test_notebook_id, user_id=self.user.id)
        self.mock_db.scalar.return_value = mock_notebook
        self.mock_db.scalars.return_value.all.return_value = []
        req = NotesGenerationRequest(notebook_id=test_notebook_id)
        with self.assertRaises(HTTPException) as ctx:
            _resolve_generation_text(req, self.user, self.mock_db)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("No processed sources", ctx.exception.detail)

    def test_resolve_notebook_budget_truncation(self):
        import uuid
        from app.api.generation import _resolve_generation_text, MAX_GENERATION_CHARS
        from app.models.notebook import Notebook
        from app.models.source import Source
        test_notebook_id = uuid.uuid4()
        mock_notebook = Notebook(id=test_notebook_id, user_id=self.user.id)
        part1 = "B" * 120_000
        part2 = "C" * 120_000
        mock_source_1 = Source(id=uuid.uuid4(), extracted_text=part1, processing_status="completed")
        mock_source_2 = Source(id=uuid.uuid4(), extracted_text=part2, processing_status="completed")
        self.mock_db.scalar.return_value = mock_notebook
        self.mock_db.scalars.return_value.all.return_value = [mock_source_1, mock_source_2]
        req = NotesGenerationRequest(notebook_id=test_notebook_id)
        text = _resolve_generation_text(req, self.user, self.mock_db)
        self.assertLessEqual(len(text), MAX_GENERATION_CHARS + 10)
        self.assertTrue(text.startswith("B" * 100))

    def test_resolve_source_id_with_mismatched_notebook_id_raises_404(self):
        import uuid
        from fastapi import HTTPException
        from app.api.generation import _resolve_generation_text
        self.mock_db.scalar.return_value = None
        req = NotesGenerationRequest(source_id=uuid.uuid4(), notebook_id=uuid.uuid4())
        with self.assertRaises(HTTPException) as ctx:
            _resolve_generation_text(req, self.user, self.mock_db)
        self.assertEqual(ctx.exception.status_code, 404)

    def test_resolve_empty_request_raises_422(self):
        from fastapi import HTTPException
        from app.api.generation import _resolve_generation_text
        req = NotesGenerationRequest()
        with self.assertRaises(HTTPException) as ctx:
            _resolve_generation_text(req, self.user, self.mock_db)
        self.assertEqual(ctx.exception.status_code, 422)


class MockAwaitable:
    def __init__(self, val=None):
        self.val = val

    def __await__(self):
        yield self.val
        return self.val


def _run_coro(coro):
    """Run a coroutine to completion without an asyncio event loop."""
    try:
        val = coro.send(None)
        while True:
            val = coro.send(val)
    except StopIteration as e:
        return e.value


class TestGenerationApiEndpoints(unittest.TestCase):
    """API-level tests for authentication contract, cross-user isolation, error handling, and all eight endpoints."""

    def setUp(self):
        import uuid
        from app.models.user import User

        self.user_a = User(id=uuid.uuid4(), email="user_a@example.com")
        self.user_b = User(id=uuid.uuid4(), email="user_b@example.com")
        self.mock_db = MagicMock()
        self.mock_service = MagicMock()

        self.mock_service.stream_study_notes.return_value = MockAwaitable("notes_stream")
        self.mock_service.stream_five_mark_answer.return_value = MockAwaitable("five_mark_stream")
        self.mock_service.stream_ten_mark_answer.return_value = MockAwaitable("ten_mark_stream")
        self.mock_service.stream_simple_explanation.return_value = MockAwaitable("simple_stream")
        self.mock_service.stream_summary.return_value = MockAwaitable("summary_stream")
        self.mock_service.generate_mcqs_structured.return_value = MockAwaitable({"data": {"questions": []}})
        self.mock_service.generate_viva_structured.return_value = MockAwaitable({"data": {"questions": []}})
        self.mock_service.generate_flashcards_structured.return_value = MockAwaitable({"data": {"cards": []}})

    def test_router_level_authentication_enforced_on_all_endpoints(self):
        """Verify the generation router explicitly requires get_current_user for all endpoints."""
        from app.api.generation import router
        from app.api.deps import get_current_user

        dependency_callables = [d.dependency for d in router.dependencies]
        self.assertIn(
            get_current_user,
            dependency_callables,
            "The generation router must enforce get_current_user across all its endpoints."
        )

    def test_unauthenticated_request_fails_via_dependency(self):
        """Verify get_current_user raises HTTP 401 when user is unauthenticated (None)."""
        from app.api.auth import get_current_user
        from fastapi import HTTPException

        with self.assertRaises(HTTPException) as ctx:
            get_current_user(None)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("Missing or invalid authentication token", ctx.exception.detail)

    def test_cross_user_source_access_returns_404(self):
        """User A attempting to access User B's source raises HTTP 404."""
        import uuid
        from fastapi import HTTPException
        from app.api.generation import generate_notes

        self.mock_db.scalar.return_value = None
        req = NotesGenerationRequest(source_id=uuid.uuid4())

        with self.assertRaises(HTTPException) as ctx:
            _run_coro(generate_notes(req, self.user_a, self.mock_db, self.mock_service))
        self.assertEqual(ctx.exception.status_code, 404)
        self.assertIn("not found or access denied", ctx.exception.detail)

    def test_cross_user_notebook_access_returns_404(self):
        """User A attempting to access User B's notebook raises HTTP 404."""
        import uuid
        from fastapi import HTTPException
        from app.api.generation import generate_notes

        self.mock_db.scalar.return_value = None
        req = NotesGenerationRequest(notebook_id=uuid.uuid4())

        with self.assertRaises(HTTPException) as ctx:
            _run_coro(generate_notes(req, self.user_a, self.mock_db, self.mock_service))
        self.assertEqual(ctx.exception.status_code, 404)
        self.assertIn("not found or access denied", ctx.exception.detail)

    def test_unprocessed_source_returns_400(self):
        """Requesting generation with a source still processing raises HTTP 400."""
        import uuid
        from fastapi import HTTPException
        from app.models.source import Source
        from app.api.generation import generate_notes

        pending_source = Source(
            id=uuid.uuid4(),
            display_title="Pending.pdf",
            extracted_text="Processing in flight",
            processing_status="pending",
        )
        self.mock_db.scalar.return_value = pending_source
        req = NotesGenerationRequest(source_id=pending_source.id)

        with self.assertRaises(HTTPException) as ctx:
            _run_coro(generate_notes(req, self.user_a, self.mock_db, self.mock_service))
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("not completed", ctx.exception.detail)

    def test_empty_source_text_returns_400(self):
        """Source with empty or whitespace extracted text raises HTTP 400."""
        import uuid
        from fastapi import HTTPException
        from app.models.source import Source
        from app.api.generation import generate_notes

        empty_source = Source(
            id=uuid.uuid4(),
            display_title="Empty.pdf",
            extracted_text="   \n\t  ",
            processing_status="completed",
        )
        self.mock_db.scalar.return_value = empty_source
        req = NotesGenerationRequest(source_id=empty_source.id)

        with self.assertRaises(HTTPException) as ctx:
            _run_coro(generate_notes(req, self.user_a, self.mock_db, self.mock_service))
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("No readable text", ctx.exception.detail)

    @patch("app.api.generation._stream_response")
    @patch("app.api.generation._stream_structured_response")
    def test_all_eight_endpoints_succeed_with_notebook_multiple_sources(self, mock_stream_struct, mock_stream_resp):
        """All eight generation endpoints succeed and return StreamingResponse when given an authorized notebook with multiple sources."""
        import uuid
        from app.models.notebook import Notebook
        from app.models.source import Source
        from app.api.generation import (
            generate_notes,
            generate_five_mark,
            generate_ten_mark,
            generate_mcqs,
            generate_viva,
            explain_simply,
            generate_flashcards,
            generate_summary,
        )

        mock_stream_resp.return_value = MagicMock(status_code=200, media_type="text/event-stream")
        mock_stream_struct.return_value = MagicMock(status_code=200, media_type="text/event-stream")

        nb_id = uuid.uuid4()
        mock_nb = Notebook(id=nb_id, user_id=self.user_a.id)
        source1 = Source(id=uuid.uuid4(), extracted_text="Calculus limits.", processing_status="completed")
        source2 = Source(id=uuid.uuid4(), extracted_text="Calculus derivatives.", processing_status="completed")

        self.mock_db.scalar.return_value = mock_nb
        self.mock_db.scalars.return_value.all.return_value = [source1, source2]
        req = NotesGenerationRequest(notebook_id=nb_id)

        endpoints = [
            ("generate_notes", generate_notes),
            ("generate_five_mark", generate_five_mark),
            ("generate_ten_mark", generate_ten_mark),
            ("generate_mcqs", generate_mcqs),
            ("generate_viva", generate_viva),
            ("explain_simply", explain_simply),
            ("generate_flashcards", generate_flashcards),
            ("generate_summary", generate_summary),
        ]

        for name, fn in endpoints:
            with self.subTest(endpoint=name):
                res = _run_coro(fn(req, self.user_a, self.mock_db, self.mock_service))
                self.assertEqual(res.media_type, "text/event-stream")
                self.assertEqual(res.status_code, 200)


if __name__ == "__main__":
    unittest.main()
