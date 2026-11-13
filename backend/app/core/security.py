"""Security utilities for password hashing and JWT authentication."""

from datetime import datetime, timedelta, timezone
import hashlib
import logging
import uuid
import bcrypt
import jwt

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def _pre_hash_password(password: str) -> bytes:
    """Pre-hash password using SHA-256 to produce a fixed 64-character hex string (64 bytes).

    This guarantees that passwords of any length (including >72 bytes and multi-byte Unicode/emojis)
    are preserved in their entirety with full entropy before being passed to bcrypt, preventing
    72-byte truncation collision vulnerabilities.
    """
    digest_hex = hashlib.sha256(password.encode("utf-8")).hexdigest()
    return digest_hex.encode("utf-8")


def hash_password(password: str) -> str:
    """Hash a plaintext password securely using SHA-256 pre-hashing and bcrypt."""
    pre_hashed = _pre_hash_password(password)
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pre_hashed, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a stored bcrypt hash.

    Supports SHA-256 pre-hashed passwords while gracefully falling back to legacy raw bcrypt
    hashes for complete backward compatibility.
    """
    try:
        hash_bytes = hashed_password.encode("utf-8")

        # 1. Primary check: SHA-256 pre-hashed password
        pre_hashed = _pre_hash_password(plain_password)
        if bcrypt.checkpw(pre_hashed, hash_bytes):
            return True

        # 2. Legacy fallback check: raw 72-byte sliced password (for backward compatibility)
        legacy_bytes = plain_password.encode("utf-8")[:72]
        if bcrypt.checkpw(legacy_bytes, hash_bytes):
            return True

        return False
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
