"""Automated unit and integration tests for StudyHub V2 Notebook Foundation API."""

import unittest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.db.session import Base, get_db_session
from app.main import app
from app.models.conversation import Conversation
from app.models.notebook import Notebook
from app.models.source import Source
from app.models.user import User

# In-memory SQLite database for isolated test execution
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db_session] = override_get_db


class TestNotebooksAPI(unittest.TestCase):
    """Test suite for V2 notebook creation, listing, detail, update, delete, and isolation."""

    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

    def setUp(self):
        app.dependency_overrides[get_db_session] = override_get_db
        db = TestingSessionLocal()
        db.query(Source).delete()
        db.query(Conversation).delete()
        db.query(Notebook).delete()
        db.query(User).delete()
        db.commit()

        # Create two test users
        self.user_a = User(
            id=uuid.uuid4(),
            email="usera@example.com",
            password_hash="hashed_pw_a",
            display_name="User A",
        )
        self.user_b = User(
            id=uuid.uuid4(),
            email="userb@example.com",
            password_hash="hashed_pw_b",
            display_name="User B",
        )
        db.add_all([self.user_a, self.user_b])
        db.commit()

        self.user_a_token = create_access_token(subject=self.user_a.id)
        self.user_b_token = create_access_token(subject=self.user_b.id)
        self.headers_a = {"Authorization": f"Bearer {self.user_a_token}"}
        self.headers_b = {"Authorization": f"Bearer {self.user_b_token}"}
        db.close()

    def test_create_notebook_success(self):
        payload = {
            "title": "Quantum Computing 101",
            "description": "Notes and research on quantum mechanics",
        }
        res = self.client.post("/api/v1/notebooks", json=payload, headers=self.headers_a)
        self.assertEqual(res.status_code, 201)

        data = res.json()
        self.assertEqual(data["title"], "Quantum Computing 101")
        self.assertEqual(data["description"], "Notes and research on quantum mechanics")
        self.assertEqual(data["user_id"], str(self.user_a.id))
        self.assertIn("id", data)

    def test_create_notebook_requires_bearer_auth(self):
        payload = {"title": "Unauthorized Notebook"}

        # No headers -> 401
        res_no_auth = self.client.post("/api/v1/notebooks", json=payload)
        self.assertEqual(res_no_auth.status_code, 401)

        # Invalid token -> 401
        res_bad_auth = self.client.post(
            "/api/v1/notebooks",
            json=payload,
            headers={"Authorization": "Bearer invalid_token_123"},
        )
        self.assertEqual(res_bad_auth.status_code, 401)

        # X-Session-ID header without Bearer token -> 401 (must NOT fallback to anonymous)
        res_session_auth = self.client.post(
            "/api/v1/notebooks",
            json=payload,
            headers={"X-Session-ID": "anon-session-999"},
        )
        self.assertEqual(res_session_auth.status_code, 401)

    def test_list_notebooks_and_summary_counts(self):
        db = TestingSessionLocal()
        nb1 = Notebook(user_id=self.user_a.id, title="Physics Notebook")
        nb2 = Notebook(user_id=self.user_b.id, title="User B Notebook")
        db.add_all([nb1, nb2])
        db.commit()

        # Add a source and a conversation to nb1
        source = Source(
            notebook_id=nb1.id,
            source_type="pdf",
            display_title="Lecture 1.pdf",
            storage_key="secret/storage/path.pdf",
        )
        conv = Conversation(
            notebook_id=nb1.id,
            user_id=self.user_a.id,
            title="Chat about Physics",
        )
        db.add_all([source, conv])
        db.commit()
        db.close()

        # User A lists notebooks
        res_a = self.client.get("/api/v1/notebooks", headers=self.headers_a)
        self.assertEqual(res_a.status_code, 200)
        data_a = res_a.json()
        self.assertEqual(len(data_a), 1)
        self.assertEqual(data_a[0]["title"], "Physics Notebook")
        self.assertEqual(data_a[0]["source_count"], 1)
        self.assertEqual(data_a[0]["conversation_count"], 1)

        # User B lists notebooks
        res_b = self.client.get("/api/v1/notebooks", headers=self.headers_b)
        self.assertEqual(res_b.status_code, 200)
        data_b = res_b.json()
        self.assertEqual(len(data_b), 1)
        self.assertEqual(data_b[0]["title"], "User B Notebook")
        self.assertEqual(data_b[0]["source_count"], 0)
        self.assertEqual(data_b[0]["conversation_count"], 0)

    def test_get_notebook_detail_and_storage_key_exclusion(self):
        db = TestingSessionLocal()
        nb = Notebook(user_id=self.user_a.id, title="Chemistry Lab")
        db.add(nb)
        db.commit()

        source = Source(
            notebook_id=nb.id,
            source_type="text",
            display_title="Lab Instructions",
            storage_key="private/bucket/lab_instructions.txt",
        )
        conv = Conversation(
            notebook_id=nb.id,
            user_id=self.user_a.id,
            title="Experiment Discussion",
        )
        db.add_all([source, conv])
        db.commit()

        nb_id = nb.id
        db.close()

        res = self.client.get(f"/api/v1/notebooks/{nb_id}", headers=self.headers_a)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["title"], "Chemistry Lab")
        self.assertEqual(len(data["sources"]), 1)
        self.assertEqual(data["sources"][0]["display_title"], "Lab Instructions")
        # EXPLICIT AUDIT REQUIREMENT: storage_key must NOT be present in source response schema
        self.assertNotIn("storage_key", data["sources"][0])

        self.assertEqual(len(data["conversations"]), 1)
        self.assertEqual(data["conversations"][0]["title"], "Experiment Discussion")

    def test_notebook_ownership_isolation_returns_404(self):
        db = TestingSessionLocal()
        nb_a = Notebook(user_id=self.user_a.id, title="User A Secret Notebook")
        db.add(nb_a)
        db.commit()
        nb_a_id = nb_a.id
        db.close()

        # User B attempts to access User A's notebook -> Must return 404 Not Found (not 403)
        res_get = self.client.get(f"/api/v1/notebooks/{nb_a_id}", headers=self.headers_b)
        self.assertEqual(res_get.status_code, 404)
        self.assertEqual(res_get.json()["detail"], "Notebook not found")

        # User B attempts to update User A's notebook -> Must return 404
        res_patch = self.client.patch(
            f"/api/v1/notebooks/{nb_a_id}",
            json={"title": "Hacked Title"},
            headers=self.headers_b,
        )
        self.assertEqual(res_patch.status_code, 404)

        # User B attempts to delete User A's notebook -> Must return 404
        res_delete = self.client.delete(f"/api/v1/notebooks/{nb_a_id}", headers=self.headers_b)
        self.assertEqual(res_delete.status_code, 404)

        # User B attempts to list conversations for User A's notebook -> Must return 404
        res_convs = self.client.get(
            f"/api/v1/notebooks/{nb_a_id}/conversations",
            headers=self.headers_b,
        )
        self.assertEqual(res_convs.status_code, 404)

    def test_update_notebook_success(self):
        db = TestingSessionLocal()
        nb = Notebook(user_id=self.user_a.id, title="Old Title", description="Old Desc")
        db.add(nb)
        db.commit()
        nb_id = nb.id
        db.close()

        payload = {"title": "Updated Title", "description": "Updated Desc"}
        res = self.client.patch(f"/api/v1/notebooks/{nb_id}", json=payload, headers=self.headers_a)
        self.assertEqual(res.status_code, 200)

        data = res.json()
        self.assertEqual(data["title"], "Updated Title")
        self.assertEqual(data["description"], "Updated Desc")

    def test_delete_notebook_success(self):
        db = TestingSessionLocal()
        nb = Notebook(user_id=self.user_a.id, title="To Delete")
        db.add(nb)
        db.commit()
        nb_id = nb.id
        db.close()

        res = self.client.delete(f"/api/v1/notebooks/{nb_id}", headers=self.headers_a)
        self.assertEqual(res.status_code, 204)

        # Verify deletion in DB
        res_get = self.client.get(f"/api/v1/notebooks/{nb_id}", headers=self.headers_a)
        self.assertEqual(res_get.status_code, 404)

    def test_get_notebook_conversations_success(self):
        db = TestingSessionLocal()
        nb = Notebook(user_id=self.user_a.id, title="Biology")
        db.add(nb)
        db.commit()

        c1 = Conversation(notebook_id=nb.id, user_id=self.user_a.id, title="Genetics Chat")
        c2 = Conversation(notebook_id=nb.id, user_id=self.user_a.id, title="Ecology Chat")
        db.add_all([c1, c2])
        db.commit()
        nb_id = nb.id
        db.close()

        res = self.client.get(f"/api/v1/notebooks/{nb_id}/conversations", headers=self.headers_a)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(len(data), 2)
        titles = [c["title"] for c in data]
        self.assertIn("Genetics Chat", titles)
        self.assertIn("Ecology Chat", titles)


if __name__ == "__main__":
    unittest.main()
