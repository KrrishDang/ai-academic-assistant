"""Pydantic schemas for authentication and user profile management."""

import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator


class UserRegisterRequest(BaseModel):
    """Input payload for user registration."""

    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=8, max_length=72, description="User password (8-72 chars)")
    display_name: str | None = Field(default=None, max_length=100, description="Optional display name")

    @field_validator("email")
    @classmethod
    def validate_and_normalize_email(cls, v: str) -> str:
        """Normalize and validate email address."""
        if not isinstance(v, str):
            raise ValueError("Email must be a string.")
        v = v.strip().lower()
        if not v or "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Invalid email address format.")
        return v


class UserLoginRequest(BaseModel):
    """Input payload for user login."""

    email: str = Field(..., description="User email address")
    password: str = Field(..., description="User password")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        """Normalize email address."""
        if not isinstance(v, str):
            raise ValueError("Email must be a string.")
        return v.strip().lower()


class UserResponse(BaseModel):
    """Public user information returned by API endpoints. Never exposes password hashes."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    display_name: str | None = None
    created_at: datetime


class TokenResponse(BaseModel):
    """Bearer token response payload."""

    access_token: str
    token_type: str = "bearer"
