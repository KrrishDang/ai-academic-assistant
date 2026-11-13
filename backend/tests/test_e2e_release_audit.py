"""End-to-End Release Audit and Journey Verification for StudyHub V2 (Phase 5A).

Tests all 20 requirements from the release protocol against real PostgreSQL
and real FastAPI application stack.
"""

import io
import json
import unittest
import uuid
import fitz
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.db.session import Base, get_db_session
from app.main import app
from app.models.notebook import Notebook
from app.models.source import Source
from app.models.study_material import StudyMaterial
from app.models.user import User
from app.models.conversation import Conversation


def _create_sample_pdf_bytes(text_content: str = "Operating Systems virtual memory and paging concepts.") -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 72), text_content)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


class TestE2EReleaseAuditJourney(unittest.TestCase):
    """Executes the full 20-step production readiness verification on PostgreSQL."""

    @classmethod
    def setUpClass(cls):
        settings = get_settings()
        cls.engine = create_engine(settings.database_url)
        with cls.engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        cls.SessionLocal = sessionmaker(bind=cls.engine)

    def setUp(self):
        self.session: Session = self.SessionLocal()
        app.dependency_overrides[get_db_session] = lambda: self.session
        self.client = TestClient(app)

    def tearDown(self):
        self.session.close()
        app.dependency_overrides.clear()

    def test_complete_twenty_step_user_journey(self):
        # 1. Register a new user
        user_email = f"audit_user_{uuid.uuid4().hex[:8]}@example.com"
        password = "SecurePassword123!"
        reg_resp = self.client.post(
            "/api/v1/auth/register",
            json={"email": user_email, "password": password, "name": "Audit Student"},
        )
        self.assertEqual(reg_resp.status_code, 201, reg_resp.text)
        user_data = reg_resp.json()
        user_id = user_data["id"]
        self.assertEqual(user_data["email"], user_email)

        # 2. Log out and log back in
        login_resp = self.client.post(
            "/api/v1/auth/login",
            json={"email": user_email, "password": password},
        )
        self.assertEqual(login_resp.status_code, 200, login_resp.text)
        tokens = login_resp.json()
        self.assertIn("access_token", tokens)
        token = tokens["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Verify /auth/me returns the logged in user
        me_resp = self.client.get("/api/v1/auth/me", headers=headers)
        self.assertEqual(me_resp.status_code, 200)
        self.assertEqual(me_resp.json()["id"], user_id)

        # 3. Create a notebook
        nb_resp = self.client.post(
            "/api/v1/notebooks",
            headers=headers,
            json={"title": "CS301 Operating Systems", "description": "Core systems revision"},
        )
        self.assertEqual(nb_resp.status_code, 201, nb_resp.text)
        notebook_id = nb_resp.json()["id"]
        self.assertEqual(nb_resp.json()["title"], "CS301 Operating Systems")

        # 4. Upload a supported PDF
        pdf_text = "Virtual memory allows the execution of processes that are not completely in memory. Paging breaks physical memory into frames."
        pdf_bytes = _create_sample_pdf_bytes(pdf_text)
        files = {"file": ("os_ch9_virtual_memory.pdf", pdf_bytes, "application/pdf")}
        upload_resp = self.client.post(
            f"/api/v1/notebooks/{notebook_id}/sources",
            headers=headers,
            files=files,
        )
        self.assertEqual(upload_resp.status_code, 201, upload_resp.text)
        source_data = upload_resp.json()
        source_id = source_data["id"]
        self.assertEqual(source_data["processing_status"], "completed")

        # 5. Verify source processing and extracted content in database
        sources_list_resp = self.client.get(
            f"/api/v1/notebooks/{notebook_id}/sources",
            headers=headers,
        )
        self.assertEqual(sources_list_resp.status_code, 200)
        sources_list = sources_list_resp.json()
        self.assertEqual(len(sources_list), 1)
        self.assertEqual(sources_list[0]["id"], source_id)
        # Direct DB check for extracted text
        db_source = self.session.scalar(select(Source).where(Source.id == uuid.UUID(source_id)))
        self.assertIsNotNone(db_source)
        self.assertIn("Virtual memory allows", db_source.extracted_text)

        # 6. Open the notebook workspace
        nb_detail_resp = self.client.get(f"/api/v1/notebooks/{notebook_id}", headers=headers)
        self.assertEqual(nb_detail_resp.status_code, 200)
        self.assertEqual(nb_detail_resp.json()["id"], notebook_id)
        self.assertEqual(len(nb_detail_resp.json()["sources"]), 1)

        # 7. Create a conversation
        conv_resp = self.client.post(
            "/api/v1/conversations",
            headers=headers,
            json={"notebook_id": notebook_id, "title": "Virtual Memory Discussion"},
        )
        self.assertEqual(conv_resp.status_code, 201, conv_resp.text)
        conv_id = conv_resp.json()["id"]

        # Helper to retry transient upstream Gemini 503 capacity spikes during live testing
        def _post_with_retry(url, **kwargs):
            import time
            resp = None
            for attempt in range(5):
                resp = self.client.post(url, **kwargs)
                if resp.status_code == 200 and "temporary error (503)" in resp.text:
                    time.sleep(3)
                    continue
                if resp.status_code in (502, 503) and ("temporary error" in resp.text or "503" in resp.text):
                    time.sleep(3)
                    continue
                return resp
            return resp

        # 8 & 9. Ask a question and verify answer & citations SSE stream
        chat_resp = _post_with_retry(
            f"/api/v1/conversations/{conv_id}/chat",
            headers=headers,
            json={"message": "Explain what virtual memory allows."},
        )
        # The endpoint returns a streaming response
        self.assertEqual(chat_resp.status_code, 200)
        stream_text = chat_resp.text
        self.assertIn("event: citations", stream_text)
        self.assertIn("event: done", stream_text)

        # 10. Verify citations point to uploaded source
        # Parse citation event data
        found_source_citation = False
        for line in stream_text.splitlines():
            if line.startswith("data: ") and '"citations"' in line:
                payload = json.loads(line[6:])
                citations = payload.get("citations", [])
                for cite in citations:
                    if cite.get("source_id") == source_id:
                        found_source_citation = True
        self.assertTrue(found_source_citation, "Citation should reference the uploaded source ID")

        # 11. Generate study notes
        guide_resp = _post_with_retry(
            f"/api/v1/notebooks/{notebook_id}/generate/study-guide",
            headers=headers,
            json={"title": "OS Summary Guide", "focus_topics": ["Virtual Memory", "Paging"]},
        )
        self.assertEqual(guide_resp.status_code, 201, guide_resp.text)
        guide_data = guide_resp.json()
        guide_id = guide_data["id"]
        self.assertEqual(guide_data["material_type"], "study_guide")
        self.assertTrue(len(guide_data["content"]) > 0)

        # 12. Reload page and verify persisted material
        mats_list_resp = self.client.get(
            f"/api/v1/notebooks/{notebook_id}/study-materials",
            headers=headers,
        )
        self.assertEqual(mats_list_resp.status_code, 200)
        mats = mats_list_resp.json()
        self.assertTrue(any(m["id"] == guide_id for m in mats))

        # 13. Generate flashcards and verify structure
        fc_resp = _post_with_retry(
            f"/api/v1/notebooks/{notebook_id}/generate/flashcards",
            headers=headers,
            json={"title": "Virtual Memory Flashcards", "num_cards": 5, "difficulty": "Medium"},
        )
        self.assertEqual(fc_resp.status_code, 201, fc_resp.text)
        fc_data = fc_resp.json()
        self.assertEqual(fc_data["material_type"], "flashcards")
        cards = fc_data["structured_content"]["flashcards"]
        self.assertTrue(len(cards) >= 1)
        self.assertIn("front", cards[0])
        self.assertIn("back", cards[0])

        # 14. Generate exam paper with answer key
        exam1_resp = _post_with_retry(
            f"/api/v1/notebooks/{notebook_id}/generate/exam-paper",
            headers=headers,
            json={"title": "Midterm Exam", "total_marks": 25, "include_answer_key": True},
        )
        self.assertEqual(exam1_resp.status_code, 201, exam1_resp.text)
        exam1_data = exam1_resp.json()
        self.assertEqual(exam1_data["material_type"], "exam_paper")
        q1 = exam1_data["structured_content"]["questions"][0]
        self.assertIsNotNone(q1.get("model_answer"), "Exam with answer key should include model answer")

        # 15. Generate exam paper without answer key
        exam2_resp = _post_with_retry(
            f"/api/v1/notebooks/{notebook_id}/generate/exam-paper",
            headers=headers,
            json={"title": "Student Mock Exam", "total_marks": 25, "include_answer_key": False},
        )
        self.assertEqual(exam2_resp.status_code, 201, exam2_resp.text)
        exam2_data = exam2_resp.json()
        for q in exam2_data["structured_content"]["questions"]:
            self.assertIsNone(q.get("model_answer"), "Exam without answer key must not reveal model answers")
            self.assertEqual(len(q.get("key_points", [])), 0)

        # 16. Delete a study material and verify persistence
        del_mat_resp = self.client.delete(f"/api/v1/study-materials/{guide_id}", headers=headers)
        self.assertEqual(del_mat_resp.status_code, 204)
        get_deleted_mat = self.client.get(f"/api/v1/study-materials/{guide_id}", headers=headers)
        self.assertEqual(get_deleted_mat.status_code, 404)

        # 17. Delete a source and verify expected behavior
        del_src_resp = self.client.delete(f"/api/v1/sources/{source_id}", headers=headers)
        self.assertEqual(del_src_resp.status_code, 204)
        sources_after_del = self.client.get(f"/api/v1/notebooks/{notebook_id}/sources", headers=headers).json()
        self.assertEqual(len(sources_after_del), 0)

        # 18. Delete notebook and verify cascading deletion
        del_nb_resp = self.client.delete(f"/api/v1/notebooks/{notebook_id}", headers=headers)
        self.assertEqual(del_nb_resp.status_code, 204)
        # Direct DB checks
        nb_check = self.session.scalar(select(Notebook).where(Notebook.id == uuid.UUID(notebook_id)))
        self.assertIsNone(nb_check)
        # Conversations cascade check
        conv_check = self.session.scalar(select(Conversation).where(Conversation.notebook_id == uuid.UUID(notebook_id)))
        self.assertIsNone(conv_check)
        # Study materials cascade check
        mat_check = self.session.scalar(select(StudyMaterial).where(StudyMaterial.notebook_id == uuid.UUID(notebook_id)))
        self.assertIsNone(mat_check)

        # 19. Multi-user isolation verification
        # Create user B and fresh notebook for User B
        user_b_email = f"audit_user_b_{uuid.uuid4().hex[:8]}@example.com"
        reg_b = self.client.post("/api/v1/auth/register", json={"email": user_b_email, "password": password, "name": "User B"})
        self.assertEqual(reg_b.status_code, 201)
        login_b = self.client.post("/api/v1/auth/login", json={"email": user_b_email, "password": password})
        self.assertEqual(login_b.status_code, 200)
        token_b = login_b.json()["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # Create private notebook for User B
        nb_b = self.client.post("/api/v1/notebooks", headers=headers_b, json={"title": "User B Private Notebook"}).json()
        nb_b_id = nb_b["id"]

        # Attempt cross-user access: User 1 tries to access User B's notebook -> 404
        cross_nb = self.client.get(f"/api/v1/notebooks/{nb_b_id}", headers=headers)
        self.assertEqual(cross_nb.status_code, 404)

        # Attempt cross-user upload: User 1 tries to upload to User B's notebook -> 404
        cross_up = self.client.post(
            f"/api/v1/notebooks/{nb_b_id}/sources",
            headers=headers,
            files={"file": ("malicious.pdf", _create_sample_pdf_bytes("Hack"), "application/pdf")},
        )
        self.assertEqual(cross_up.status_code, 404)

        # 20. Verify V1 endpoints remain functional
        # V1 Anonymous / authenticated documents list
        v1_docs = self.client.get("/api/v1/documents", headers=headers)
        self.assertEqual(v1_docs.status_code, 200)
        self.assertIsInstance(v1_docs.json(), list)


if __name__ == "__main__":
    unittest.main()
