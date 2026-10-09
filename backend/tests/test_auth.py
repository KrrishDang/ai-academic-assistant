"""Comprehensive automated unit tests for authentication foundation in StudyHub V2."""

import unittest
from datetime import timedelta
import jwt
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.session import Base, get_db_session
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
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


class TestSecurityUtilities(unittest.TestCase):
    """Test password hashing and JWT token utility functions."""

    def test_hash_and_verify_password(self):
        password = "SecureTestPassword123!"
        hashed = hash_password(password)

        self.assertNotEqual(password, hashed)
        self.assertTrue(verify_password(password, hashed))
        self.assertFalse(verify_password("WrongPassword123!", hashed))

    def test_jwt_token_creation_and_decoding(self):
        subject = "test-user-id-12345"
        token = create_access_token(subject=subject)

        decoded = decode_access_token(token)
        self.assertEqual(decoded["sub"], subject)
        self.assertIn("exp", decoded)

    def test_jwt_token_expiration(self):
        subject = "expired-user-id"
        expired_token = create_access_token(subject=subject, expires_delta=timedelta(seconds=-10))

        with self.assertRaises(jwt.ExpiredSignatureError):
            decode_access_token(expired_token)


class TestAuthAPIEndpoints(unittest.TestCase):
    """Integration tests for registration, login, and user profile endpoints."""

    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

    def setUp(self):
        # Clean users table before each test
        db = TestingSessionLocal()
        db.query(User).delete()
        db.commit()
        db.close()

    def test_register_user_success(self):
        payload = {
            "email": "student@example.com",
            "password": "Password123!",
            "display_name": "Alex Student"
        }
        response = self.client.post("/api/v1/auth/register", json=payload)
        self.assertEqual(response.status_code, 201)

        data = response.json()
        self.assertEqual(data["email"], "student@example.com")
        self.assertEqual(data["display_name"], "Alex Student")
        self.assertIn("id", data)
        self.assertNotIn("password_hash", data)

    def test_register_duplicate_email(self):
        payload = {
            "email": "duplicate@example.com",
            "password": "Password123!"
        }
        resp1 = self.client.post("/api/v1/auth/register", json=payload)
        self.assertEqual(resp1.status_code, 201)

        resp2 = self.client.post("/api/v1/auth/register", json=payload)
        self.assertEqual(resp2.status_code, 400)
        self.assertIn("already exists", resp2.json()["detail"])

    def test_register_invalid_email_format(self):
        payload = {
            "email": "not-an-email",
            "password": "Password123!"
        }
        response = self.client.post("/api/v1/auth/register", json=payload)
        self.assertEqual(response.status_code, 422)

    def test_login_user_success(self):
        # Register user first
        reg_payload = {"email": "user@example.com", "password": "CorrectPassword123"}
        self.client.post("/api/v1/auth/register", json=reg_payload)

        # Login
        login_payload = {"email": "user@example.com", "password": "CorrectPassword123"}
        response = self.client.post("/api/v1/auth/login", json=login_payload)
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["token_type"], "bearer")

    def test_login_invalid_credentials(self):
        # Register user
        reg_payload = {"email": "user2@example.com", "password": "CorrectPassword123"}
        self.client.post("/api/v1/auth/register", json=reg_payload)

        # Wrong password
        login_payload = {"email": "user2@example.com", "password": "WrongPassword"}
        response = self.client.post("/api/v1/auth/login", json=login_payload)
        self.assertEqual(response.status_code, 401)
        self.assertIn("Invalid email or password", response.json()["detail"])

        # Non-existent user
        login_payload_fake = {"email": "fake@example.com", "password": "Password123"}
        response_fake = self.client.post("/api/v1/auth/login", json=login_payload_fake)
        self.assertEqual(response_fake.status_code, 401)
        self.assertIn("Invalid email or password", response_fake.json()["detail"])

    def test_get_me_profile_success(self):
        # Register and login
        reg_payload = {"email": "me@example.com", "password": "MySecretPassword123", "display_name": "Me User"}
        self.client.post("/api/v1/auth/register", json=reg_payload)

        login_res = self.client.post("/api/v1/auth/login", json={"email": "me@example.com", "password": "MySecretPassword123"})
        token = login_res.json()["access_token"]

        # Call GET /api/v1/auth/me with Bearer header
        headers = {"Authorization": f"Bearer {token}"}
        me_res = self.client.get("/api/v1/auth/me", headers=headers)
        self.assertEqual(me_res.status_code, 200)

        me_data = me_res.json()
        self.assertEqual(me_data["email"], "me@example.com")
        self.assertEqual(me_data["display_name"], "Me User")

    def test_get_me_missing_or_invalid_token(self):
        # No header
        res_no_token = self.client.get("/api/v1/auth/me")
        self.assertEqual(res_no_token.status_code, 401)

        # Invalid token header
        res_bad_token = self.client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid.token.value"})
        self.assertEqual(res_bad_token.status_code, 401)


if __name__ == "__main__":
    unittest.main()
