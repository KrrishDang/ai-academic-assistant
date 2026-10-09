"""Comprehensive automated unit tests for authentication foundation and security fixes in StudyHub V2."""

import unittest
from datetime import timedelta
import bcrypt
import jwt
from pydantic import SecretStr
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.session import Base, get_db_session
from app.core.config import Settings
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
    """Test password hashing, long password collision prevention, and JWT token utilities."""

    def test_hash_and_verify_password(self):
        password = "SecureTestPassword123!"
        hashed = hash_password(password)

        self.assertNotEqual(password, hashed)
        self.assertTrue(verify_password(password, hashed))
        self.assertFalse(verify_password("WrongPassword123!", hashed))

    def test_long_password_no_truncation_collisions(self):
        """Verify that two passwords sharing the first 72 bytes but having different suffixes do NOT authenticate as the same password."""
        base_prefix = "A" * 72
        pwd1 = base_prefix + "SUFFIX_ONE_XXXX"
        pwd2 = base_prefix + "SUFFIX_TWO_YYYY"

        hash1 = hash_password(pwd1)

        # pwd1 should verify against hash1
        self.assertTrue(verify_password(pwd1, hash1))
        # pwd2 MUST NOT verify against hash1, proving no 72-byte truncation collision exists
        self.assertFalse(verify_password(pwd2, hash1))

    def test_unicode_and_emoji_passwords(self):
        """Verify long multi-byte Unicode and emoji passwords process without truncation errors."""
        emoji_pwd = "🔒🔑🎓" * 30  # 90 multi-byte characters (>250 UTF-8 bytes)
        hashed = hash_password(emoji_pwd)

        self.assertTrue(verify_password(emoji_pwd, hashed))
        self.assertFalse(verify_password(emoji_pwd + "❌", hashed))

    def test_backward_compatibility_with_legacy_raw_bcrypt_hashes(self):
        """Verify that legacy raw bcrypt hashes (created without SHA-256 pre-hashing) still authenticate cleanly."""
        legacy_pwd = "LegacyUserPassword123"
        legacy_bytes = legacy_pwd.encode("utf-8")[:72]
        legacy_hash = bcrypt.hashpw(legacy_bytes, bcrypt.gensalt()).decode("utf-8")

        # Fallback check in verify_password must authenticate legacy hash
        self.assertTrue(verify_password(legacy_pwd, legacy_hash))
        self.assertFalse(verify_password("WrongLegacyUserPassword", legacy_hash))

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


class TestConfigJWTSecretValidation(unittest.TestCase):
    """Test JWT_SECRET_KEY security validation rules across environments."""

    def test_production_environment_rejects_missing_secret(self):
        with self.assertRaises(ValueError) as ctx:
            Settings(_env_file=None, app_env="production", database_url="sqlite:///:memory:", JWT_SECRET_KEY="")
        self.assertIn("JWT_SECRET_KEY must be provided", str(ctx.exception))

    def test_production_environment_rejects_placeholder_secret(self):
        placeholders = [
            "your_jwt_secret_key_here",
            "v2_studyhub_default_secret_key_change_in_production",
            "change-me",
            "secret",
        ]
        for ph in placeholders:
            with self.assertRaises(ValueError) as ctx:
                Settings(
                    _env_file=None,
                    app_env="production",
                    database_url="sqlite:///:memory:",
                    JWT_SECRET_KEY=ph,
                )
            self.assertIn("Insecure placeholder JWT_SECRET_KEY is not permitted", str(ctx.exception))

    def test_production_environment_rejects_short_secret(self):
        with self.assertRaises(ValueError) as ctx:
            Settings(
                _env_file=None,
                app_env="production",
                database_url="sqlite:///:memory:",
                JWT_SECRET_KEY="short_secret_under_32_chars",
            )
        self.assertIn("at least 32 characters long", str(ctx.exception))

    def test_production_environment_accepts_valid_strong_secret(self):
        strong_secret = "a_very_secure_production_secret_key_that_is_at_least_32_chars_long_123456789"
        settings = Settings(
            _env_file=None,
            app_env="production",
            database_url="sqlite:///:memory:",
            JWT_SECRET_KEY=strong_secret,
        )
        self.assertEqual(settings.jwt_secret_key.get_secret_value(), strong_secret)

    def test_development_environment_uses_safe_dev_fallback_when_missing(self):
        settings = Settings(
            _env_file=None,
            app_env="development",
            database_url="sqlite:///:memory:",
            JWT_SECRET_KEY="",
        )
        self.assertIsNotNone(settings.jwt_secret_key)
        self.assertTrue(len(settings.jwt_secret_key.get_secret_value()) >= 32)


class TestAuthAPIEndpoints(unittest.TestCase):
    """Integration tests for registration, login, and user profile endpoints."""

    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

    def setUp(self):
        app.dependency_overrides[get_db_session] = override_get_db
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
        reg_payload = {"email": "user@example.com", "password": "CorrectPassword123"}
        self.client.post("/api/v1/auth/register", json=reg_payload)

        login_payload = {"email": "user@example.com", "password": "CorrectPassword123"}
        response = self.client.post("/api/v1/auth/login", json=login_payload)
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertIn("access_token", data)
        self.assertEqual(data["token_type"], "bearer")

    def test_login_invalid_credentials(self):
        reg_payload = {"email": "user2@example.com", "password": "CorrectPassword123"}
        self.client.post("/api/v1/auth/register", json=reg_payload)

        login_payload = {"email": "user2@example.com", "password": "WrongPassword"}
        response = self.client.post("/api/v1/auth/login", json=login_payload)
        self.assertEqual(response.status_code, 401)
        self.assertIn("Invalid email or password", response.json()["detail"])

        login_payload_fake = {"email": "fake@example.com", "password": "Password123"}
        response_fake = self.client.post("/api/v1/auth/login", json=login_payload_fake)
        self.assertEqual(response_fake.status_code, 401)
        self.assertIn("Invalid email or password", response_fake.json()["detail"])

    def test_get_me_profile_success(self):
        reg_payload = {"email": "me@example.com", "password": "MySecretPassword123", "display_name": "Me User"}
        self.client.post("/api/v1/auth/register", json=reg_payload)

        login_res = self.client.post("/api/v1/auth/login", json={"email": "me@example.com", "password": "MySecretPassword123"})
        token = login_res.json()["access_token"]

        headers = {"Authorization": f"Bearer {token}"}
        me_res = self.client.get("/api/v1/auth/me", headers=headers)
        self.assertEqual(me_res.status_code, 200)

        me_data = me_res.json()
        self.assertEqual(me_data["email"], "me@example.com")
        self.assertEqual(me_data["display_name"], "Me User")

    def test_get_me_missing_or_invalid_token(self):
        res_no_token = self.client.get("/api/v1/auth/me")
        self.assertEqual(res_no_token.status_code, 401)

        res_bad_token = self.client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid.token.value"})
        self.assertEqual(res_bad_token.status_code, 401)


if __name__ == "__main__":
    unittest.main()
