"""Security utilities for password hashing and JWT authentication."""

from datetime import datetime, timedelta, timezone
import logging
import uuid
import bcrypt
import jwt

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def hash_password(password: str) -> str:
    """Hash a plaintext password securely using bcrypt."""
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a stored bcrypt hash."""
    try:
        pwd_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception as err:
        logger.warning("Password verification failed with exception: %s", err)
        return False


def create_access_token(
    subject: str | uuid.UUID,
    expires_delta: timedelta | None = None,
    additional_claims: dict | None = None,
) -> str:
    """Generate a signed JWT access token for a given user subject."""
    settings = get_settings()
    secret = settings.jwt_secret_key.get_secret_value()
    algorithm = settings.jwt_algorithm

    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.jwt_access_token_expire_minutes)

    payload = {
        "sub": str(subject),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    if additional_claims:
        payload.update(additional_claims)

    return jwt.encode(payload, secret, algorithm=algorithm)


def decode_access_token(token: str) -> dict:
    """Decode and validate a signed JWT access token.

    Raises:
        jwt.PyJWTError if invalid or expired.
    """
    settings = get_settings()
    secret = settings.jwt_secret_key.get_secret_value()
    algorithm = settings.jwt_algorithm

    return jwt.decode(token, secret, algorithms=[algorithm])
