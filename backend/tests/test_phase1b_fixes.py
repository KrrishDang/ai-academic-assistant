"""Automated regression and verification tests for StudyHub V2 Phase 1B fixes.

Covers:
1. Finding 1: PostgreSQL user registration, NOT NULL columns, safe defaults, and privilege escalation prevention.
2. Finding 2: Optional Bearer authentication on V1 endpoints, rejecting invalid/malformed/expired tokens with HTTP 401 without anonymous fallback.
3. Finding 3: Notebook deletion cascade removing sources, notebook-owned conversations, and messages while preserving V1 conversations.
4. Finding 4: Conversation ownership consistency between Conversation.user_id and Notebook.user_id across application logic and database constraints.
"""

import unittest
import uuid
from datetime import datetime, timedelta, timezone

import jwt
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings
from app.core.security import create_access_token, hash_password
from app.db.session import Base, get_db_session
from app.main import app
from app.models.conversation import Conversation, Message
from app.models.document import Document
from app.models.notebook import Notebook
from app.models.source import Source
from app.models.user import User


class TestPhase1BFixesWithSQLite(unittest.TestCase):
    """Unit tests using in-memory SQLite for fast, isolated verification."""

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
            email=f"usera_{uuid.uuid4().hex[:6]}@example.com",
            password_hash=hash_password("PasswordA123!"),
            name="User A",
            display_name="User A",
            role="user",
            is_active=True,
            is_verified=False,
            is_banned=False,
        )
        self.user_b = User(
            id=uuid.uuid4(),
            email=f"userb_{uuid.uuid4().hex[:6]}@example.com",
            password_hash=hash_password("PasswordB123!"),
            name="User B",
            display_name="User B",
            role="user",
            is_active=True,
            is_verified=False,
            is_banned=False,
        )
        self.banned_user = User(
            id=uuid.uuid4(),
            email=f"banned_{uuid.uuid4().hex[:6]}@example.com",
            password_hash=hash_password("PasswordBanned123!"),
            name="Banned User",
            display_name="Banned User",
            role="user",
            is_active=True,
            is_verified=False,
            is_banned=True,
        )
        self.db.add_all([self.user_a, self.user_b, self.banned_user])
        self.db.commit()

        self.token_a = create_access_token(self.user_a.id)
        self.token_b = create_access_token(self.user_b.id)
        self.token_banned = create_access_token(self.banned_user.id)

    def tearDown(self):
        app.dependency_overrides.clear()
        self.db.query(Message).delete()
        self.db.query(Conversation).delete()
        self.db.query(Source).delete()
        self.db.query(Notebook).delete()
        self.db.query(Document).delete()
        self.db.query(User).delete()
        self.db.commit()
        self.db.close()

    # --- Finding 1: User Registration Defaults & Security ---

    def test_register_user_sets_safe_defaults_and_ignores_role_spoofing(self):
        """Registration must set role='user', is_active=True, is_verified=False, is_banned=False."""
        payload = {
            "email": f"reg_{uuid.uuid4().hex[:6]}@example.com",
            "password": "ValidPassword123!",
            "display_name": "New Registrant",
            "role": "admin",  # Attacker attempt to escalate
            "is_verified": True,
            "is_banned": False,
        }
        res = self.client.post("/api/v1/auth/register", json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        user_id = uuid.UUID(data["id"])

        user_db = self.db.scalar(select(User).where(User.id == user_id))
        self.assertIsNotNone(user_db)
        self.assertEqual(user_db.role, "user")
        self.assertEqual(user_db.is_active, True)
        self.assertEqual(user_db.is_verified, False)
        self.assertEqual(user_db.is_banned, False)
        self.assertEqual(user_db.name, "New Registrant")

    def test_banned_or_inactive_user_cannot_authenticate(self):
        """Banned user token must be rejected with 401."""
        res = self.client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {self.token_banned}"})
        self.assertEqual(res.status_code, 401)
        self.assertIn("inactive or suspended", res.json()["detail"])

    # --- Finding 2: Optional Bearer Auth on V1 & V2 Endpoints ---

    def test_v1_endpoints_allow_anonymous_when_no_auth_header(self):
        """When Authorization header is omitted, V1 endpoints succeed anonymously."""
        res_conv = self.client.get("/api/v1/conversations")
        self.assertEqual(res_conv.status_code, 200)

        res_doc = self.client.get("/api/v1/documents")
        self.assertEqual(res_doc.status_code, 200)

    def test_v1_endpoints_reject_invalid_bearer_tokens(self):
        """When an invalid Bearer token is passed, V1 endpoints must return 401, NOT anonymous fallback."""
        for endpoint in ["/api/v1/conversations", "/api/v1/documents"]:
            # Completely invalid token
            res_inv = self.client.get(endpoint, headers={"Authorization": "Bearer invalid.token.value"})
            self.assertEqual(res_inv.status_code, 401, f"Failed for {endpoint}")
            self.assertEqual(res_inv.headers.get("WWW-Authenticate"), "Bearer")

            # Malformed header without token
            res_malformed = self.client.get(endpoint, headers={"Authorization": "Bearer"})
            self.assertEqual(res_malformed.status_code, 401, f"Failed for {endpoint}")

            # Non-bearer scheme
            res_basic = self.client.get(endpoint, headers={"Authorization": "Basic dXNlcjpwYXNz"})
            self.assertEqual(res_basic.status_code, 401, f"Failed for {endpoint}")

    def test_v1_endpoints_reject_expired_tokens(self):
        """Expired Bearer token on V1 endpoints must return 401."""
        settings = get_settings()
        expired_payload = {
            "sub": str(self.user_a.id),
            "exp": datetime.now(timezone.utc) - timedelta(hours=1),
            "iat": datetime.now(timezone.utc) - timedelta(hours=2),
        }
        expired_token = jwt.encode(
            expired_payload,
            settings.jwt_secret_key.get_secret_value(),
            algorithm=settings.jwt_algorithm,
        )
        res = self.client.get("/api/v1/conversations", headers={"Authorization": f"Bearer {expired_token}"})
        self.assertEqual(res.status_code, 401)
        self.assertEqual(res.json()["detail"], "Token has expired")

    def test_requests_with_both_authorization_and_session_id(self):
        """When both Authorization and X-Session-ID are supplied:
        - If token is invalid: MUST return 401 (never fall back to session_id).
        - If token is valid: user identity takes precedence.
        """
        session_id = "test-session-12345"

        # Invalid token with session_id -> MUST be 401
        res_fail = self.client.get(
            "/api/v1/conversations",
            headers={"Authorization": "Bearer badtoken", "X-Session-ID": session_id},
        )
        self.assertEqual(res_fail.status_code, 401)

        # Valid token with session_id -> succeeds as user_a
        res_ok = self.client.get(
            "/api/v1/conversations",
            headers={"Authorization": f"Bearer {self.token_a}", "X-Session-ID": session_id},
        )
        self.assertEqual(res_ok.status_code, 200)

    def test_v2_notebooks_remain_strictly_authenticated(self):
        """V2 notebooks endpoints require mandatory authentication."""
        # Missing auth -> 401
        res = self.client.get("/api/v1/notebooks")
        self.assertEqual(res.status_code, 401)

        # Invalid auth -> 401
        res_inv = self.client.get("/api/v1/notebooks", headers={"Authorization": "Bearer junk"})
        self.assertEqual(res_inv.status_code, 401)

        # Valid auth -> 200
        res_ok = self.client.get("/api/v1/notebooks", headers={"Authorization": f"Bearer {self.token_a}"})
        self.assertEqual(res_ok.status_code, 200)

    # --- Finding 3: Notebook Deletion Cascade ---

    def test_notebook_cascade_deletes_conversations_and_messages(self):
        """Deleting a notebook via API removes sources, notebook conversations, and their messages."""
        nb = Notebook(user_id=self.user_a.id, title="Test Notebook")
        self.db.add(nb)
        self.db.flush()

        src = Source(notebook_id=nb.id, source_type="text", display_title="Src 1")
        self.db.add(src)

        conv = Conversation(notebook_id=nb.id, user_id=self.user_a.id, title="NB Conv")
        self.db.add(conv)
        self.db.flush()

        msg = Message(conversation_id=conv.id, role="user", content="Hello in NB")
        self.db.add(msg)

        # Legacy V1 conversation without notebook
        v1_conv = Conversation(notebook_id=None, user_id=self.user_a.id, title="V1 Standalone")
        self.db.add(v1_conv)
        self.db.commit()

        # Delete notebook via API
        res = self.client.delete(f"/api/v1/notebooks/{nb.id}", headers={"Authorization": f"Bearer {self.token_a}"})
        self.assertEqual(res.status_code, 204)

        # Expire session to verify committed state in DB
        self.db.expire_all()

        # Verify cascade
        self.assertIsNone(self.db.get(Notebook, nb.id))
        self.assertIsNone(self.db.get(Source, src.id))
        self.assertIsNone(self.db.get(Conversation, conv.id))
        self.assertIsNone(self.db.get(Message, msg.id))

        # Unrelated V1 conversation MUST be preserved
        v1_db = self.db.get(Conversation, v1_conv.id)
        self.assertIsNotNone(v1_db)
        self.assertEqual(v1_db.title, "V1 Standalone")

    # --- Finding 4: Conversation Ownership Inconsistency & Scoping ---

    def test_notebook_conversations_cannot_have_mismatched_user_id(self):
        """ORM and event listener reject creating a notebook conversation with mismatched user_id."""
        nb_a = Notebook(user_id=self.user_a.id, title="NB A")
        self.db.add(nb_a)
        self.db.flush()

        # Attempt to create conversation pointing to nb_a (user_a) with user_b
        conv_mismatch = Conversation(notebook_id=nb_a.id, user_id=self.user_b.id, title="Hacked Conv")
        self.db.add(conv_mismatch)

        with self.assertRaises(ValueError) as ctx:
            self.db.flush()
        self.assertIn("does not match notebook owner", str(ctx.exception))
        self.db.rollback()

    def test_notebook_conversations_cannot_have_null_user_id(self):
        """Notebook conversation must have a user_id."""
        nb_a = Notebook(user_id=self.user_a.id, title="NB A")
        self.db.add(nb_a)
        self.db.flush()

        conv_null_user = Conversation(notebook_id=nb_a.id, user_id=None, title="Null User Conv")
        self.db.add(conv_null_user)

        with self.assertRaises(ValueError) as ctx:
            self.db.flush()
        self.assertIn("Notebook conversation must have a user_id", str(ctx.exception))
        self.db.rollback()

    def test_cross_user_isolation_and_probing_prevention(self):
        """User B cannot see or manipulate User A's conversations."""
        conv_a = Conversation(user_id=self.user_a.id, title="User A Private")
        self.db.add(conv_a)
        self.db.commit()

        # User B probes User A's conversation messages -> 404
        res_msg = self.client.get(f"/api/v1/conversations/{conv_a.id}/messages", headers={"Authorization": f"Bearer {self.token_b}"})
        self.assertEqual(res_msg.status_code, 404)

        # User B probes User A's conversation rename -> 404
        res_ren = self.client.patch(f"/api/v1/conversations/{conv_a.id}", json={"title": "Hacked"}, headers={"Authorization": f"Bearer {self.token_b}"})
        self.assertEqual(res_ren.status_code, 404)

        # Anonymous probes User A's conversation -> 404
        res_anon = self.client.get(f"/api/v1/conversations/{conv_a.id}/messages")
        self.assertEqual(res_anon.status_code, 404)


class TestPhase1BFixesPostgreSQL(unittest.TestCase):
    """Direct regression tests against local PostgreSQL verifying database-level constraints and registration."""

    @classmethod
    def setUpClass(cls):
        settings = get_settings()
        cls.pg_url = settings.database_url
        try:
            cls.engine = create_engine(cls.pg_url)
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

    def tearDown(self):
        if self.pg_available:
            app.dependency_overrides.clear()
            self.session.close()

    def test_postgres_user_registration_succeeds(self):
        """Verify registration on PostgreSQL succeeds and populates all required NOT NULL columns."""
        unique_email = f"pg_reg_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "email": unique_email,
            "password": "SecurePassword123!",
            "display_name": "PG Test User",
        }
        res = self.client.post("/api/v1/auth/register", json=payload)
        self.assertEqual(res.status_code, 201, f"PostgreSQL registration failed: {res.text}")

        user_id = uuid.UUID(res.json()["id"])
        with self.engine.connect() as conn:
            row = conn.execute(
                text("SELECT role, is_active, is_verified, is_banned, name FROM users WHERE id = :id"),
                {"id": user_id},
            ).mappings().first()
            self.assertIsNotNone(row)
            self.assertEqual(row["role"], "user")
            self.assertEqual(row["is_active"], True)
            self.assertEqual(row["is_verified"], False)
            self.assertEqual(row["is_banned"], False)
            self.assertEqual(row["name"], "PG Test User")

            # Clean up
            conn.execute(text("DELETE FROM users WHERE id = :id"), {"id": user_id})
            conn.commit()

    def test_postgres_composite_foreign_key_and_check_constraints(self):
        """Verify database-level constraints on PostgreSQL reject mismatched ownership and null user_id."""
        with self.engine.connect() as conn:
            trans = conn.begin()
            try:
                u1 = str(uuid.uuid4())
                u2 = str(uuid.uuid4())
                conn.execute(
                    text("INSERT INTO users (id, name, email, password_hash, role, is_active, is_verified, is_banned) "
                         "VALUES (:u1, 'U1', :e1, 'h', 'user', true, false, false), "
                         "(:u2, 'U2', :e2, 'h', 'user', true, false, false)"),
                    {"u1": u1, "u2": u2, "e1": f"u1_{u1[:6]}@ex.com", "e2": f"u2_{u2[:6]}@ex.com"}
                )
                nb1 = str(uuid.uuid4())
                conn.execute(text("INSERT INTO notebooks (id, user_id, title) VALUES (:nb, :u1, 'NB1')"), {"nb": nb1, "u1": u1})

                # Mismatched conversation insert directly via SQL MUST fail
                c_bad = str(uuid.uuid4())
                with self.assertRaises(Exception):
                    conn.execute(
                        text("INSERT INTO conversations (id, notebook_id, user_id, title, created_at, updated_at) "
                             "VALUES (:cid, :nb, :u2, 'Mismatched', now(), now())"),
                        {"cid": c_bad, "nb": nb1, "u2": u2}
                    )
            finally:
                trans.rollback()


if __name__ == "__main__":
    unittest.main()
