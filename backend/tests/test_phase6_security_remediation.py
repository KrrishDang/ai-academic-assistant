"""Comprehensive test suite for Phase 6.3 Security Remediation.

Covers:
1. Authenticated document upload associates documents.user_id with the user.
2. Document listing returns only the authenticated user's documents; anonymous listing returns empty (never all documents).
3. Document deletion requires authentication (401 for anonymous).
4. Document deletion by owner succeeds (204).
5. Document deletion of another user's document returns 404.
6. Document renaming requires authentication and enforces ownership (401 anonymous, 404 non-owner).
7. Document replacement requires authentication and enforces ownership (401 anonymous, 404 non-owner).
8. All legacy generation endpoints require authentication (401 for anonymous).
9. Authenticated generation endpoint calls succeed (mock GeminiService).
10. Dashboard stats return zeroed counts and empty arrays for anonymous requests.
11. Dashboard stats return only the authenticated user's counts and activities.
12. Search returns empty arrays for anonymous requests.
13. Search returns only the authenticated user's matching documents and conversations.
14. Cross-user isolation: User A cannot see or search User B's content.
"""

import io
import json
import unittest
import uuid
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token, hash_password
from app.db.session import Base, get_db_session
from app.main import app
from app.models.conversation import Conversation, Message
from app.models.document import Document
from app.models.user import User


def _create_sample_pdf_bytes(text_content: str = "Academic test material.") -> bytes:
    """Generate a valid PDF in memory using fitz."""
    import fitz

    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 72), text_content)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


async def _mock_stream_generator(*chunks):
    for c in chunks:
        yield c


class TestPhase6SecurityRemediation(unittest.TestCase):
    """Test suite verifying Phase 6.3 security remediation across documents, generation, dashboard, and search."""

    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        cls.TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)
        Base.metadata.create_all(bind=cls.engine)

    def setUp(self):
        self.db: Session = self.TestingSessionLocal()
        app.dependency_overrides[get_db_session] = lambda: self.db
        self.client = TestClient(app)

        # Create two distinct test users
        self.user_a = User(
            id=uuid.uuid4(),
            email=f"user_a_{uuid.uuid4().hex[:6]}@example.com",
            password_hash=hash_password("Pass123!"),
            name="User A",
            role="user",
            is_active=True,
            is_verified=True,
            is_banned=False,
        )
        self.user_b = User(
            id=uuid.uuid4(),
            email=f"user_b_{uuid.uuid4().hex[:6]}@example.com",
            password_hash=hash_password("Pass123!"),
            name="User B",
            role="user",
            is_active=True,
            is_verified=True,
            is_banned=False,
        )
        self.db.add_all([self.user_a, self.user_b])
        self.db.commit()

        self.token_a = create_access_token(self.user_a.id)
        self.token_b = create_access_token(self.user_b.id)
        self.auth_headers_a = {"Authorization": f"Bearer {self.token_a}"}
        self.auth_headers_b = {"Authorization": f"Bearer {self.token_b}"}

    def tearDown(self):
        self.db.close()

    def test_01_authenticated_upload_associates_user_id(self):
        """1. Authenticated document upload associates documents.user_id with current_user."""
        pdf_bytes = _create_sample_pdf_bytes("Physics notes for User A")
        files = {"file": ("physics.pdf", io.BytesIO(pdf_bytes), "application/pdf")}

        response = self.client.post("/api/v1/documents", files=files, headers=self.auth_headers_a)
        self.assertEqual(response.status_code, 201)
        doc_id = uuid.UUID(response.json()["id"])

        db_doc = self.db.query(Document).filter(Document.id == doc_id).first()
        self.assertIsNotNone(db_doc)
        self.assertEqual(db_doc.user_id, self.user_a.id)

    def test_01b_anonymous_upload_rejected_with_401(self):
        """1b. Anonymous uploads are rejected with 401 Unauthorized to prevent orphaned files."""
        pdf_bytes = _create_sample_pdf_bytes("Anonymous document")
        files = {"file": ("anon.pdf", io.BytesIO(pdf_bytes), "application/pdf")}

        response = self.client.post("/api/v1/documents", files=files)
        self.assertEqual(response.status_code, 401)

    def test_02_document_listing_scoped_and_anonymous_empty(self):
        """2. Document listing returns only the authenticated user's documents; anonymous listing returns empty."""
        # User A uploads a doc
        pdf_bytes_a = _create_sample_pdf_bytes("User A Document")
        res_a = self.client.post(
            "/api/v1/documents",
            files={"file": ("doc_a.pdf", io.BytesIO(pdf_bytes_a), "application/pdf")},
            headers=self.auth_headers_a,
        )
        self.assertEqual(res_a.status_code, 201)
        doc_a_id = res_a.json()["id"]

        # Anonymous listing returns empty list (never all documents, even with X-Session-ID)
        anon_res = self.client.get("/api/v1/documents")
        self.assertEqual(anon_res.status_code, 200)
        self.assertEqual(anon_res.json(), [])

        anon_res_session = self.client.get("/api/v1/documents", headers={"X-Session-ID": "fake-session"})
        self.assertEqual(anon_res_session.status_code, 200)
        self.assertEqual(anon_res_session.json(), [])

        # User A listing contains User A's doc
        list_a = self.client.get("/api/v1/documents", headers=self.auth_headers_a)
        self.assertEqual(list_a.status_code, 200)
        ids_a = [d["id"] for d in list_a.json()]
        self.assertIn(doc_a_id, ids_a)

        # User B listing does NOT contain User A's doc
        list_b = self.client.get("/api/v1/documents", headers=self.auth_headers_b)
        self.assertEqual(list_b.status_code, 200)
        ids_b = [d["id"] for d in list_b.json()]
        self.assertNotIn(doc_a_id, ids_b)

    def test_03_document_deletion_requires_auth(self):
        """3. Document deletion requires authentication (401 for anonymous)."""
        random_id = uuid.uuid4()
        response = self.client.delete(f"/api/v1/documents/{random_id}")
        self.assertEqual(response.status_code, 401)

    def test_04_document_deletion_by_owner_succeeds(self):
        """4. Document deletion by owner succeeds (204)."""
        pdf_bytes = _create_sample_pdf_bytes("Document to delete")
        res = self.client.post(
            "/api/v1/documents",
            files={"file": ("to_delete.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
            headers=self.auth_headers_a,
        )
        self.assertEqual(res.status_code, 201)
        doc_id = res.json()["id"]

        del_res = self.client.delete(f"/api/v1/documents/{doc_id}", headers=self.auth_headers_a)
        self.assertEqual(del_res.status_code, 204)

        db_doc = self.db.query(Document).filter(Document.id == uuid.UUID(doc_id)).first()
        self.assertIsNone(db_doc)

    def test_05_document_deletion_of_another_user_returns_404(self):
        """5. Document deletion of another user's document returns 404."""
        pdf_bytes = _create_sample_pdf_bytes("User A secret document")
        res = self.client.post(
            "/api/v1/documents",
            files={"file": ("secret_a.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
            headers=self.auth_headers_a,
        )
        self.assertEqual(res.status_code, 201)
        doc_id = res.json()["id"]

        # User B attempts to delete User A's document
        del_res = self.client.delete(f"/api/v1/documents/{doc_id}", headers=self.auth_headers_b)
        self.assertEqual(del_res.status_code, 404)

        # Document still exists in DB
        db_doc = self.db.query(Document).filter(Document.id == uuid.UUID(doc_id)).first()
        self.assertIsNotNone(db_doc)

    def test_06_document_renaming_requires_auth_and_enforces_ownership(self):
        """6. Document renaming requires authentication and enforces ownership (401 anonymous, 404 non-owner)."""
        pdf_bytes = _create_sample_pdf_bytes("Doc to rename")
        res = self.client.post(
            "/api/v1/documents",
            files={"file": ("original.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
            headers=self.auth_headers_a,
        )
        self.assertEqual(res.status_code, 201)
        doc_id = res.json()["id"]

        # Anonymous attempt -> 401
        anon_res = self.client.patch(f"/api/v1/documents/{doc_id}", json={"filename": "new_name.pdf"})
        self.assertEqual(anon_res.status_code, 401)

        # Non-owner attempt (User B) -> 404
        b_res = self.client.patch(
            f"/api/v1/documents/{doc_id}",
            json={"filename": "hijacked.pdf"},
            headers=self.auth_headers_b,
        )
        self.assertEqual(b_res.status_code, 404)

        # Owner attempt (User A) -> 200
        a_res = self.client.patch(
            f"/api/v1/documents/{doc_id}",
            json={"filename": "renamed_by_owner.pdf"},
            headers=self.auth_headers_a,
        )
        self.assertEqual(a_res.status_code, 200)
        self.assertEqual(a_res.json()["filename"], "renamed_by_owner.pdf")

    def test_07_document_replacement_requires_auth_and_enforces_ownership(self):
        """7. Document replacement requires authentication and enforces ownership (401 anonymous, 404 non-owner)."""
        pdf_bytes = _create_sample_pdf_bytes("Doc to replace")
        res = self.client.post(
            "/api/v1/documents",
            files={"file": ("initial.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
            headers=self.auth_headers_a,
        )
        self.assertEqual(res.status_code, 201)
        doc_id = res.json()["id"]

        new_pdf_bytes = _create_sample_pdf_bytes("Replacement content")

        # Anonymous replacement attempt -> 401
        anon_res = self.client.put(
            f"/api/v1/documents/{doc_id}",
            files={"file": ("replacement.pdf", io.BytesIO(new_pdf_bytes), "application/pdf")},
        )
        self.assertEqual(anon_res.status_code, 401)

        # User B replacement attempt -> 404
        b_res = self.client.put(
            f"/api/v1/documents/{doc_id}",
            files={"file": ("replacement.pdf", io.BytesIO(new_pdf_bytes), "application/pdf")},
            headers=self.auth_headers_b,
        )
        self.assertEqual(b_res.status_code, 404)

        # Owner replacement attempt -> 200
        a_res = self.client.put(
            f"/api/v1/documents/{doc_id}",
            files={"file": ("replacement.pdf", io.BytesIO(new_pdf_bytes), "application/pdf")},
            headers=self.auth_headers_a,
        )
        self.assertEqual(a_res.status_code, 200)
        self.assertEqual(a_res.json()["filename"], "replacement.pdf")

    def test_08_all_legacy_generation_endpoints_require_auth(self):
        """8. All legacy generation endpoints require authentication (401 for anonymous)."""
        endpoints = [
            "/api/v1/generate/notes",
            "/api/v1/generation/notes",
            "/api/v1/generate/5-mark-answer",
            "/api/v1/generation/five-mark",
            "/api/v1/generate/10-mark-answer",
            "/api/v1/generation/ten-mark",
            "/api/v1/generate/mcqs",
            "/api/v1/generation/mcqs",
            "/api/v1/generate/viva-questions",
            "/api/v1/generation/viva",
            "/api/v1/generate/explain-simply",
            "/api/v1/generation/explain",
            "/api/v1/generate/flashcards",
            "/api/v1/generate/summary",
        ]
        payload = {"extracted_text": "Sample text for study notes."}

        for ep in endpoints:
            with self.subTest(endpoint=ep):
                res = self.client.post(ep, json=payload)
                self.assertEqual(res.status_code, 401, f"Expected 401 for unauthenticated {ep}")

    @patch("app.services.gemini_service.GeminiService.stream_text")
    @patch("app.services.gemini_service.GeminiService.generate_text")
    def test_09_authenticated_generation_endpoint_calls_succeed(self, mock_generate, mock_stream):
        """9. Authenticated generation endpoint calls succeed (mock GeminiService)."""
        # Mock streaming response
        mock_stream.return_value = _mock_stream_generator("Summary chunk 1. ", "Summary chunk 2.")

        # Mock structured response for MCQs
        mcq_payload = json.dumps({
            "metadata": {"title": "Test MCQs"},
            "questions": [
                {
                    "question": "What is Python?",
                    "options": ["A language", "A snake", "Both", "None"],
                    "correctAnswer": 2,
                }
            ],
        })
        mock_generate.return_value = mcq_payload

        payload = {"extracted_text": "Sample lecture text on Python programming."}

        # Test authenticated streaming endpoint
        res_notes = self.client.post("/api/v1/generate/notes", json=payload, headers=self.auth_headers_a)
        self.assertEqual(res_notes.status_code, 200)
        self.assertIn("text/event-stream", res_notes.headers.get("content-type", ""))

        # Test authenticated structured endpoint
        res_mcqs = self.client.post("/api/v1/generate/mcqs", json=payload, headers=self.auth_headers_a)
        self.assertEqual(res_mcqs.status_code, 200)
        self.assertIn("text/event-stream", res_mcqs.headers.get("content-type", ""))

    def test_10_dashboard_stats_anonymous_zeroed(self):
        """10. Dashboard stats return zeroed counts and empty arrays for anonymous requests."""
        # Seed some data in database
        doc = Document(
            id=uuid.uuid4(),
            original_filename="seeded.pdf",
            content_type="application/pdf",
            file_size_bytes=1000,
            page_count=2,
            text_character_count=500,
            storage_key="seeded_key",
            sha256="seeded_sha",
            extracted_text="seeded text",
            user_id=self.user_a.id,
        )
        conv = Conversation(
            id=uuid.uuid4(),
            title="Seeded Chat",
            user_id=self.user_a.id,
        )
        self.db.add_all([doc, conv])
        self.db.commit()

        # Anonymous request
        res = self.client.get("/api/v1/dashboard/stats")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["total_documents"], 0)
        self.assertEqual(data["total_conversations"], 0)
        self.assertEqual(data["total_ai_generations"], 0)
        self.assertEqual(data["recent_conversations"], [])
        self.assertEqual(data["recent_documents"], [])
        self.assertEqual(data["recent_activities"], [])

        # Even with arbitrary X-Session-ID, anonymous still receives zeroed stats
        res_session = self.client.get("/api/v1/dashboard/stats", headers={"X-Session-ID": "arbitrary-id"})
        self.assertEqual(res_session.status_code, 200)
        data_s = res_session.json()
        self.assertEqual(data_s["total_documents"], 0)
        self.assertEqual(data_s["total_conversations"], 0)
        self.assertEqual(data_s["total_ai_generations"], 0)

    def test_11_dashboard_stats_authenticated_user_scoped(self):
        """11. Dashboard stats return only the authenticated user's counts and activities."""
        # Clear or create isolated documents and conversations
        doc_a = Document(
            id=uuid.uuid4(),
            original_filename="user_a_notes.pdf",
            content_type="application/pdf",
            file_size_bytes=1200,
            page_count=3,
            text_character_count=600,
            storage_key=f"uploads/{uuid.uuid4()}.pdf",
            sha256=uuid.uuid4().hex,
            extracted_text="User A notes",
            user_id=self.user_a.id,
        )
        conv_a = Conversation(
            id=uuid.uuid4(),
            title="User A Chat",
            user_id=self.user_a.id,
        )
        msg_a = Message(
            id=uuid.uuid4(),
            conversation_id=conv_a.id,
            role="assistant",
            content="Hello from AI for User A",
        )

        doc_b = Document(
            id=uuid.uuid4(),
            original_filename="user_b_notes.pdf",
            content_type="application/pdf",
            file_size_bytes=2400,
            page_count=5,
            text_character_count=1200,
            storage_key=f"uploads/{uuid.uuid4()}.pdf",
            sha256=uuid.uuid4().hex,
            extracted_text="User B notes",
            user_id=self.user_b.id,
        )
        conv_b = Conversation(
            id=uuid.uuid4(),
            title="User B Chat",
            user_id=self.user_b.id,
        )
        self.db.add_all([doc_a, conv_a, msg_a, doc_b, conv_b])
        self.db.commit()

        # Query stats as User A
        res_a = self.client.get("/api/v1/dashboard/stats", headers=self.auth_headers_a)
        self.assertEqual(res_a.status_code, 200)
        data_a = res_a.json()
        self.assertGreaterEqual(data_a["total_documents"], 1)
        self.assertGreaterEqual(data_a["total_conversations"], 1)
        self.assertGreaterEqual(data_a["total_ai_generations"], 1)

        doc_ids_a = [d["id"] for d in data_a["recent_documents"]]
        self.assertIn(str(doc_a.id), doc_ids_a)
        self.assertNotIn(str(doc_b.id), doc_ids_a)

        conv_ids_a = [c["id"] for c in data_a["recent_conversations"]]
        self.assertIn(str(conv_a.id), conv_ids_a)
        self.assertNotIn(str(conv_b.id), conv_ids_a)

    def test_12_search_anonymous_empty(self):
        """12. Search returns empty arrays for anonymous requests."""
        # Ensure there is content in DB
        doc = Document(
            id=uuid.uuid4(),
            original_filename="calculus_exam.pdf",
            content_type="application/pdf",
            file_size_bytes=1000,
            page_count=1,
            text_character_count=100,
            storage_key=f"uploads/{uuid.uuid4()}.pdf",
            sha256=uuid.uuid4().hex,
            extracted_text="Calculus integrals",
            user_id=self.user_a.id,
        )
        self.db.add(doc)
        self.db.commit()

        # Anonymous query
        res = self.client.get("/api/v1/search?q=calculus")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {"documents": [], "conversations": [], "messages": []})

        # Anonymous query with X-Session-ID
        res_session = self.client.get("/api/v1/search?q=calculus", headers={"X-Session-ID": "random-sess"})
        self.assertEqual(res_session.status_code, 200)
        self.assertEqual(res_session.json(), {"documents": [], "conversations": [], "messages": []})

    def test_13_search_authenticated_user_scoped(self):
        """13. Search returns only the authenticated user's matching documents and conversations."""
        doc_a = Document(
            id=uuid.uuid4(),
            original_filename="quantum_physics_a.pdf",
            content_type="application/pdf",
            file_size_bytes=1000,
            page_count=1,
            text_character_count=100,
            storage_key=f"uploads/{uuid.uuid4()}.pdf",
            sha256=uuid.uuid4().hex,
            extracted_text="Quantum mechanics lecture",
            user_id=self.user_a.id,
        )
        conv_a = Conversation(
            id=uuid.uuid4(),
            title="Quantum Entanglement Discussion",
            user_id=self.user_a.id,
        )
        doc_b = Document(
            id=uuid.uuid4(),
            original_filename="quantum_physics_b.pdf",
            content_type="application/pdf",
            file_size_bytes=1000,
            page_count=1,
            text_character_count=100,
            storage_key=f"uploads/{uuid.uuid4()}.pdf",
            sha256=uuid.uuid4().hex,
            extracted_text="Quantum teleportation notes",
            user_id=self.user_b.id,
        )
        conv_b = Conversation(
            id=uuid.uuid4(),
            title="Quantum Computing Chat",
            user_id=self.user_b.id,
        )
        self.db.add_all([doc_a, conv_a, doc_b, conv_b])
        self.db.commit()

        # Search as User A
        res_a = self.client.get("/api/v1/search?q=quantum", headers=self.auth_headers_a)
        self.assertEqual(res_a.status_code, 200)
        data_a = res_a.json()

        doc_ids_a = [d["id"] for d in data_a["documents"]]
        self.assertIn(str(doc_a.id), doc_ids_a)
        self.assertNotIn(str(doc_b.id), doc_ids_a)

        conv_ids_a = [c["id"] for c in data_a["conversations"]]
        self.assertIn(str(conv_a.id), conv_ids_a)
        self.assertNotIn(str(conv_b.id), conv_ids_a)

    def test_14_cross_user_isolation(self):
        """14. Cross-user isolation: User A cannot see, search, or alter User B's content."""
        # User B uploads a document
        pdf_bytes_b = _create_sample_pdf_bytes("Sensitive research data of User B")
        res_b = self.client.post(
            "/api/v1/documents",
            files={"file": ("b_research.pdf", io.BytesIO(pdf_bytes_b), "application/pdf")},
            headers=self.auth_headers_b,
        )
        self.assertEqual(res_b.status_code, 201)
        doc_b_id = res_b.json()["id"]

        # User A cannot list User B's doc
        list_a = self.client.get("/api/v1/documents", headers=self.auth_headers_a)
        self.assertEqual(list_a.status_code, 200)
        self.assertNotIn(doc_b_id, [d["id"] for d in list_a.json()])

        # User A cannot search User B's doc
        search_a = self.client.get("/api/v1/search?q=research", headers=self.auth_headers_a)
        self.assertEqual(search_a.status_code, 200)
        self.assertNotIn(doc_b_id, [d["id"] for d in search_a.json()["documents"]])

        # User A cannot delete User B's doc -> 404
        del_a = self.client.delete(f"/api/v1/documents/{doc_b_id}", headers=self.auth_headers_a)
        self.assertEqual(del_a.status_code, 404)

        # User A cannot rename User B's doc -> 404
        rename_a = self.client.patch(
            f"/api/v1/documents/{doc_b_id}",
            json={"filename": "stolen.pdf"},
            headers=self.auth_headers_a,
        )
        self.assertEqual(rename_a.status_code, 404)

        # User A cannot replace User B's doc -> 404
        rep_bytes = _create_sample_pdf_bytes("Malicious replacement")
        rep_a = self.client.put(
            f"/api/v1/documents/{doc_b_id}",
            files={"file": ("malicious.pdf", io.BytesIO(rep_bytes), "application/pdf")},
            headers=self.auth_headers_a,
        )
        self.assertEqual(rep_a.status_code, 404)

        # User A's dashboard does NOT show User B's document
        dash_a = self.client.get("/api/v1/dashboard/stats", headers=self.auth_headers_a)
        self.assertEqual(dash_a.status_code, 200)
        self.assertNotIn(doc_b_id, [d["id"] for d in dash_a.json()["recent_documents"]])


if __name__ == "__main__":
    unittest.main()
