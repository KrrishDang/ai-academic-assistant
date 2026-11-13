"""Unit, integration, and security tests for Phase 4A: Notebook Study Studio Backend."""

import json
import unittest
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings
from app.core.security import create_access_token, hash_password
from app.db.session import Base, get_db_session
from app.main import app
from app.models.notebook import Notebook
from app.models.source import Source
from app.models.study_material import StudyMaterial
from app.models.user import User
from app.services.gemini_service import GeminiStreamError
from app.services.notebook_study_service import (
    EmptyNotebookError,
    InvalidConfigurationError,
    NotebookNotFoundError,
    NotebookStudyService,
)


class TestStudyMaterialsSQLite(unittest.TestCase):
    """Fast, isolated unit and API tests using in-memory SQLite and mocked Gemini."""

    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=cls.engine)
        cls.TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)

    def setUp(self):
        self.db: Session = self.TestingSessionLocal()
        app.dependency_overrides[get_db_session] = lambda: self.db
        self.client = TestClient(app)

        # User A (Owner)
        self.user_a = User(
            id=uuid.uuid4(),
            email=f"usera_{uuid.uuid4().hex[:6]}@example.com",
            password_hash=hash_password("PassA123!"),
            name="User A",
            role="user",
        )
        self.db.add(self.user_a)

        # User B (Attacker / Other user)
        self.user_b = User(
            id=uuid.uuid4(),
            email=f"userb_{uuid.uuid4().hex[:6]}@example.com",
            password_hash=hash_password("PassB123!"),
            name="User B",
            role="user",
        )
        self.db.add(self.user_b)
        self.db.commit()

        self.token_a = create_access_token(str(self.user_a.id))
        self.headers_a = {"Authorization": f"Bearer {self.token_a}"}

        self.token_b = create_access_token(str(self.user_b.id))
        self.headers_b = {"Authorization": f"Bearer {self.token_b}"}

        # Notebook for User A
        self.notebook_a = Notebook(
            id=uuid.uuid4(),
            user_id=self.user_a.id,
            title="Distributed Systems CS401",
            description="Lecture notes and papers on consensus algorithms.",
        )
        self.db.add(self.notebook_a)

        # Ingested and completed sources for User A
        self.source_1 = Source(
            id=uuid.uuid4(),
            notebook_id=self.notebook_a.id,
            source_type="pdf",
            original_filename="raft_consensus.pdf",
            display_title="Raft Consensus Algorithm",
            extracted_text=(
                "Raft is a consensus algorithm designed as an alternative to Paxos. "
                "It was meant to be more understandable than Paxos by means of separation of logic. "
                "Raft divides time into terms of arbitrary length, which act as logical clocks. "
                "Leaders handle log replication across follower nodes."
            ),
            processing_status="completed",
        )
        self.source_2 = Source(
            id=uuid.uuid4(),
            notebook_id=self.notebook_a.id,
            source_type="docx",
            original_filename="byzantine_faults.docx",
            display_title="Byzantine Fault Tolerance",
            extracted_text=(
                "Byzantine Fault Tolerance (BFT) is the dependability of a fault-tolerant computer system. "
                "A Byzantine fault is a condition of a computer system where components may fail and there is "
                "imperfect information on whether a component has failed. In a system of n nodes, up to f "
                "faulty nodes can be tolerated if n >= 3f + 1."
            ),
            processing_status="completed",
        )
        self.db.add_all([self.source_1, self.source_2])
        self.db.commit()

    def tearDown(self):
        app.dependency_overrides.clear()
        self.db.query(StudyMaterial).delete()
        self.db.query(Source).delete()
        self.db.query(Notebook).delete()
        self.db.query(User).delete()
        self.db.commit()
        self.db.close()

    # ─── Authentication & Access Control ──────────────────────────────────────

    def test_anonymous_generation_requests_are_rejected(self):
        """Anonymous generation requests must return HTTP 401 Unauthorized."""
        res_notes = self.client.post(f"/api/v1/notebooks/{self.notebook_a.id}/generate/study-guide")
        self.assertEqual(res_notes.status_code, 401)

        res_cards = self.client.post(f"/api/v1/notebooks/{self.notebook_a.id}/generate/flashcards")
        self.assertEqual(res_cards.status_code, 401)

        res_exam = self.client.post(
            f"/api/v1/notebooks/{self.notebook_a.id}/generate/exam-paper",
            json={"total_marks": 50},
        )
        self.assertEqual(res_exam.status_code, 401)

    def test_invalid_jwt_token_is_rejected(self):
        """Invalid or malformed tokens must return HTTP 401."""
        bad_headers = {"Authorization": "Bearer invalid.jwt.token"}
        res = self.client.post(
            f"/api/v1/notebooks/{self.notebook_a.id}/generate/study-guide",
            headers=bad_headers,
        )
        self.assertEqual(res.status_code, 401)

    def test_cross_user_notebook_generation_access_is_forbidden(self):
        """User B cannot generate or access study materials in User A's notebook (returns 404)."""
        res_notes = self.client.post(
            f"/api/v1/notebooks/{self.notebook_a.id}/generate/study-guide",
            headers=self.headers_b,
        )
        self.assertEqual(res_notes.status_code, 404)

        res_cards = self.client.post(
            f"/api/v1/notebooks/{self.notebook_a.id}/generate/flashcards",
            headers=self.headers_b,
        )
        self.assertEqual(res_cards.status_code, 404)

        res_exam = self.client.post(
            f"/api/v1/notebooks/{self.notebook_a.id}/generate/exam-paper",
            headers=self.headers_b,
            json={"total_marks": 50},
        )
        self.assertEqual(res_exam.status_code, 404)

    # ─── Empty Notebook Handling ──────────────────────────────────────────────

    def test_empty_notebook_generation_rejected(self):
        """A notebook with no processed sources returns HTTP 400."""
        empty_nb = Notebook(
            id=uuid.uuid4(),
            user_id=self.user_a.id,
            title="Empty Notebook",
        )
        self.db.add(empty_nb)
        self.db.commit()

        res = self.client.post(
            f"/api/v1/notebooks/{empty_nb.id}/generate/study-guide",
            headers=self.headers_a,
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("no processed sources", res.json()["detail"].lower())

    def test_notebook_with_only_failed_or_pending_sources_rejected(self):
        """Notebooks with only failed or pending sources are rejected with HTTP 400."""
        nb = Notebook(id=uuid.uuid4(), user_id=self.user_a.id, title="Pending Only")
        self.db.add(nb)
        s_pending = Source(
            id=uuid.uuid4(),
            notebook_id=nb.id,
            source_type="pdf",
            display_title="Pending.pdf",
            processing_status="pending",
        )
        s_failed = Source(
            id=uuid.uuid4(),
            notebook_id=nb.id,
            source_type="pdf",
            display_title="Failed.pdf",
            processing_status="failed",
            error_message="Corrupt PDF",
        )
        self.db.add_all([s_pending, s_failed])
        self.db.commit()

        res = self.client.post(
            f"/api/v1/notebooks/{nb.id}/generate/study-guide",
            headers=self.headers_a,
        )
        self.assertEqual(res.status_code, 400)

    # ─── Study Guide Generation ───────────────────────────────────────────────

    @patch("app.services.gemini_service.GeminiService.generate_text")
    def test_study_guide_generation_and_persistence(self, mock_gemini):
        """Successfully generate and persist Markdown study guide with source references."""
        mock_guide_markdown = (
            "# Course Study Guide: Distributed Systems\n\n"
            "## Executive Overview\nCovers consensus and fault tolerance.\n\n"
            "## Key Concepts\n- **Raft Consensus**: Divides time into terms.\n"
            "- **Byzantine Fault Tolerance**: Requires n >= 3f + 1.\n\n"
            "## Definitions\n- **Term**: Logical clock in Raft.\n\n"
            "## Revision Summary\n- Leaders replicate logs."
        )
        mock_gemini.return_value = mock_guide_markdown

        payload = {
            "title": "Exam Prep Study Guide",
            "focus_topics": ["Consensus", "BFT"],
        }
        res = self.client.post(
            f"/api/v1/notebooks/{self.notebook_a.id}/generate/study-guide",
            headers=self.headers_a,
            json=payload,
        )
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["material_type"], "study_guide")
        self.assertEqual(data["title"], "Exam Prep Study Guide")
        self.assertEqual(data["generation_status"], "completed")
        self.assertIn("Raft Consensus", data["content"])
        self.assertIsNone(data["structured_content"])

        # Check source references
        source_refs = data["source_references"]
        self.assertEqual(len(source_refs), 2)
        titles = {s["title"] for s in source_refs}
        self.assertIn("Raft Consensus Algorithm", titles)
        self.assertIn("Byzantine Fault Tolerance", titles)

        # Verify DB persistence
        mat_id = uuid.UUID(data["id"])
        saved = self.db.query(StudyMaterial).filter(StudyMaterial.id == mat_id).first()
        self.assertIsNotNone(saved)
        self.assertEqual(saved.title, "Exam Prep Study Guide")

    # ─── Flashcards Generation ────────────────────────────────────────────────

    @patch("app.services.gemini_service.GeminiService.generate_text")
    def test_flashcards_generation_and_structured_json(self, mock_gemini):
        """Successfully generate and persist structured JSON flashcards."""
        mock_cards_json = json.dumps({
            "flashcards": [
                {
                    "front": "What is the condition for Byzantine Fault Tolerance in an n-node system?",
                    "back": "The system can tolerate up to f faulty nodes if n >= 3f + 1.",
                    "difficulty": "Hard",
                    "topic": "Fault Tolerance",
                    "source_reference": "Byzantine Fault Tolerance",
                },
                {
                    "front": "What is a term in Raft?",
                    "back": "An arbitrary period of time acting as a logical clock.",
                    "difficulty": "Medium",
                    "topic": "Consensus",
                    "source_reference": "Raft Consensus Algorithm",
                },
            ]
        })
        mock_gemini.return_value = mock_cards_json

        res = self.client.post(
            f"/api/v1/notebooks/{self.notebook_a.id}/generate/flashcards",
            headers=self.headers_a,
            json={"num_cards": 2, "difficulty": "Mixed"},
        )
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["material_type"], "flashcards")
        self.assertEqual(data["generation_status"], "completed")
        self.assertIsNone(data["content"])

        structured = data["structured_content"]
        self.assertIn("flashcards", structured)
        self.assertEqual(len(structured["flashcards"]), 2)
        card_1 = structured["flashcards"][0]
        self.assertEqual(card_1["difficulty"], "Hard")
        self.assertIn("3f + 1", card_1["back"])

    @patch("app.services.gemini_service.GeminiService.generate_text")
    def test_flashcards_malformed_json_retry_handling(self, mock_gemini):
        """Malformed JSON output from model triggers retry and parses cleanly."""
        mock_bad = "Here are your flashcards: { not valid json } ```json"
        mock_good = json.dumps({
            "flashcards": [
                {"front": "What is Raft?", "back": "A consensus algorithm.", "difficulty": "Easy"}
            ]
        })
        mock_gemini.side_effect = [mock_bad, mock_good]

        res = self.client.post(
            f"/api/v1/notebooks/{self.notebook_a.id}/generate/flashcards",
            headers=self.headers_a,
            json={"num_cards": 5},
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(len(res.json()["structured_content"]["flashcards"]), 1)
        self.assertEqual(mock_gemini.call_count, 2)

    # ─── Exam Paper Generation ────────────────────────────────────────────────

    def test_exam_paper_invalid_marks_configuration_rejected(self):
        """Total marks that are not multiples of 5 are rejected with HTTP 422."""
        res_invalid = self.client.post(
            f"/api/v1/notebooks/{self.notebook_a.id}/generate/exam-paper",
            headers=self.headers_a,
            json={"total_marks": 23, "question_types": ["five_mark", "ten_mark"]},
        )
        self.assertEqual(res_invalid.status_code, 422)

        res_zero = self.client.post(
            f"/api/v1/notebooks/{self.notebook_a.id}/generate/exam-paper",
            headers=self.headers_a,
            json={"total_marks": 0},
        )
        self.assertEqual(res_zero.status_code, 422)

    @patch("app.services.gemini_service.GeminiService.generate_text")
    def test_exam_paper_generation_with_answer_key(self, mock_gemini):
        """Successfully generate a 50-mark exam paper with 5-mark and 10-mark questions and answer key."""
        mock_paper_json = json.dumps({
            "title": "Midterm Examination: Distributed Systems",
            "total_marks": 50,
            "instructions": ["Answer all questions.", "Total time: 90 minutes."],
            "questions": [
                {
                    "question_number": 1,
                    "question_text": "Explain the role of terms as logical clocks in the Raft consensus algorithm.",
                    "marks": 5,
                    "question_type": "five_mark",
                    "difficulty": "Medium",
                    "model_answer": "Terms act as logical clocks in Raft to allow servers to detect obsolete information.",
                    "key_points": ["Arbitrary time periods", "Monotonically increasing counter", "Election per term"],
                    "source_reference": "Raft Consensus Algorithm",
                },
                {
                    "question_number": 2,
                    "question_text": "Derive the Byzantine Fault Tolerance threshold n >= 3f + 1.",
                    "marks": 10,
                    "question_type": "ten_mark",
                    "difficulty": "Hard",
                    "model_answer": "In asynchronous systems, if f nodes are faulty, the system must proceed with n - f messages...",
                    "key_points": ["Non-responsive vs malicious nodes", "Derivation of strict majority", "n >= 3f + 1"],
                    "source_reference": "Byzantine Fault Tolerance",
                },
            ]
        })
        mock_gemini.return_value = mock_paper_json

        res = self.client.post(
            f"/api/v1/notebooks/{self.notebook_a.id}/generate/exam-paper",
            headers=self.headers_a,
            json={
                "total_marks": 50,
                "question_types": ["five_mark", "ten_mark"],
                "difficulty": "Mixed",
                "include_answer_key": True,
            },
        )
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["material_type"], "exam_paper")
        paper = data["structured_content"]
        self.assertEqual(paper["total_marks"], 50)
        self.assertEqual(len(paper["questions"]), 2)
        self.assertEqual(paper["questions"][0]["marks"], 5)
        self.assertIsNotNone(paper["questions"][0]["model_answer"])

    # ─── Material Management CRUD & Cascade Delete ────────────────────────────

    def test_list_and_retrieve_study_materials(self):
        """Listing and retrieving materials works for owner and isolates from other users."""
        mat = StudyMaterial(
            id=uuid.uuid4(),
            notebook_id=self.notebook_a.id,
            material_type="study_guide",
            title="CS401 Comprehensive Notes",
            content="# Distributed Notes",
            generation_status="completed",
        )
        self.db.add(mat)
        self.db.commit()

        # List materials for notebook
        res_list = self.client.get(
            f"/api/v1/notebooks/{self.notebook_a.id}/study-materials",
            headers=self.headers_a,
        )
        self.assertEqual(res_list.status_code, 200)
        items = res_list.json()
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["id"], str(mat.id))

        # Retrieve single material
        res_get = self.client.get(
            f"/api/v1/study-materials/{mat.id}",
            headers=self.headers_a,
        )
        self.assertEqual(res_get.status_code, 200)
        self.assertEqual(res_get.json()["title"], "CS401 Comprehensive Notes")

        # User B cannot access User A's material
        res_b = self.client.get(
            f"/api/v1/study-materials/{mat.id}",
            headers=self.headers_b,
        )
        self.assertEqual(res_b.status_code, 404)

        # Delete material
        res_del = self.client.delete(
            f"/api/v1/study-materials/{mat.id}",
            headers=self.headers_a,
        )
        self.assertEqual(res_del.status_code, 204)

        # Verify deleted
        res_after = self.client.get(
            f"/api/v1/study-materials/{mat.id}",
            headers=self.headers_a,
        )
        self.assertEqual(res_after.status_code, 404)

    def test_notebook_cascade_deletes_attached_study_materials(self):
        """Deleting a notebook cascades to delete all attached study materials."""
        mat = StudyMaterial(
            id=uuid.uuid4(),
            notebook_id=self.notebook_a.id,
            material_type="flashcards",
            title="Raft Flashcards",
            structured_content={"flashcards": [{"front": "Q", "back": "A"}]},
            generation_status="completed",
        )
        self.db.add(mat)
        self.db.commit()

        mat_id = mat.id

        # Delete notebook
        res = self.client.delete(
            f"/api/v1/notebooks/{self.notebook_a.id}",
            headers=self.headers_a,
        )
        self.assertEqual(res.status_code, 204)

        # Confirm study material is also gone
        deleted_mat = self.db.query(StudyMaterial).filter(StudyMaterial.id == mat_id).first()
        self.assertIsNone(deleted_mat)


class TestStudyMaterialsPostgreSQL(unittest.TestCase):
    """Integration test against PostgreSQL verifying database constraints, JSON/JSONB and cascade delete."""

    @classmethod
    def setUpClass(cls):
        settings = get_settings()
        try:
            cls.engine = create_engine(settings.database_url)
            with cls.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            cls.pg_available = True
            cls.SessionLocal = sessionmaker(bind=cls.engine)
        except Exception:
            cls.pg_available = False

    def setUp(self):
        if not self.pg_available:
            self.skipTest("Local PostgreSQL database is not accessible")
        self.session = self.SessionLocal()
        app.dependency_overrides[get_db_session] = lambda: self.session
        self.client = TestClient(app)

        # Create test user in PG
        self.user = User(
            id=uuid.uuid4(),
            email=f"pg_study_{uuid.uuid4().hex[:6]}@example.com",
            password_hash=hash_password("Pass123!"),
            name="PG Study Tester",
            role="user",
        )
        self.session.add(self.user)
        self.session.commit()

        self.token = create_access_token(str(self.user.id))
        self.headers = {"Authorization": f"Bearer {self.token}"}

        self.notebook = Notebook(
            id=uuid.uuid4(),
            user_id=self.user.id,
            title="PG Integration Notebook",
        )
        self.session.add(self.notebook)
        self.session.commit()

    def tearDown(self):
        if self.pg_available:
            app.dependency_overrides.clear()
            self.session.query(StudyMaterial).filter(StudyMaterial.notebook_id == self.notebook.id).delete()
            self.session.query(Notebook).filter(Notebook.id == self.notebook.id).delete()
            self.session.query(User).filter(User.id == self.user.id).delete()
            self.session.commit()
            self.session.close()

    def test_postgres_study_material_crud_and_json_serialization(self):
        """Verify PostgreSQL properly persists JSON structured content and enforces cascade delete."""
        mat_id = uuid.uuid4()
        structured_data = {
            "flashcards": [
                {"front": "PG Test Question", "back": "PG Test Answer", "difficulty": "Easy"}
            ]
        }
        material = StudyMaterial(
            id=mat_id,
            notebook_id=self.notebook.id,
            material_type="flashcards",
            title="PG Flashcards",
            structured_content=structured_data,
            generation_status="completed",
            configuration={"num_cards": 1},
            source_references=[{"source_id": str(uuid.uuid4()), "title": "Test.pdf"}],
        )
        self.session.add(material)
        self.session.commit()

        # Query back through API
        res = self.client.get(f"/api/v1/study-materials/{mat_id}", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["structured_content"]["flashcards"][0]["front"], "PG Test Question")

        # Verify cascade delete on PostgreSQL
        self.session.delete(self.notebook)
        self.session.commit()

        # Query database directly
        with self.engine.connect() as conn:
            count = conn.execute(
                text("SELECT count(*) FROM study_materials WHERE id = :id"),
                {"id": mat_id},
            ).scalar()
            self.assertEqual(count, 0)


if __name__ == "__main__":
    unittest.main()
