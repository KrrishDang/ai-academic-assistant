"""Typed application settings loaded from environment variables."""

from functools import lru_cache
from typing import Any

import dotenv
# Force-load local environment variables, overriding conflicting system environment variables
dotenv.load_dotenv(override=True)

from pydantic import AliasChoices, Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the backend."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "AI Academic Assistant API"
    app_env: str = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str

    @field_validator("database_url", mode="before")
    @classmethod
    def assemble_db_url(cls, v: Any) -> Any:
        """Coerce database URLs starting with postgresql:// to use postgresql+psycopg://."""
        if isinstance(v, str):
            if v.startswith("postgresql://"):
                v = v.replace("postgresql://", "postgresql+psycopg://", 1)
            v = v.strip()
        return v

    cors_origins: str = "http://localhost:5173,http://localhost:3000,http://localhost:4173"
    log_level: str = "INFO"
    session_secret: str = "generate-a-secure-secret-key-here"
    jwt_secret_key: SecretStr | None = Field(
        default=None,
        validation_alias=AliasChoices("JWT_SECRET_KEY", "SECRET_KEY"),
    )
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60 * 24
    google_api_key: SecretStr | None = Field(
        default=None,
        validation_alias=AliasChoices("GOOGLE_API_KEY", "GEMINI_API_KEY"),
    )
    gemini_model: str = "gemini-2.5-flash"
    gemini_timeout_seconds: float = Field(default=45.0, gt=0)
    gemini_max_retries: int = Field(default=3, ge=0, le=5)
    upload_dir: str = "uploads"
    storage_backend: str = "local"
    max_upload_size_bytes: int = 20 * 1024 * 1024
    max_pdf_pages: int = 500
    aws_region: str | None = None
    aws_s3_bucket: str | None = None

    @model_validator(mode="after")
    def validate_jwt_secret_key(self) -> "Settings":
        """Enforce strong JWT secret configuration for production while providing an isolated dev fallback."""
        insecure_placeholders = {
            "v2_studyhub_default_secret_key_change_in_production",
            "your_jwt_secret_key_here",
            "change-me",
            "secret",
            "jwt_secret_key",
            "generate-a-secure-secret-key-here",
        }
        secret_val = self.jwt_secret_key.get_secret_value().strip() if self.jwt_secret_key else ""
        is_dev = self.app_env.lower() == "development"

        if not is_dev:
            if not secret_val:
                raise ValueError("JWT_SECRET_KEY must be provided in non-development environments.")
            if secret_val in insecure_placeholders:
                raise ValueError(f"Insecure placeholder JWT_SECRET_KEY is not permitted in '{self.app_env}' environment.")
            if len(secret_val) < 32:
                raise ValueError("JWT_SECRET_KEY must be at least 32 characters long in non-development environments.")
        else:
            if not secret_val or secret_val in insecure_placeholders:
                self.jwt_secret_key = SecretStr("v2_studyhub_dev_secret_key_only_for_local_development_32chars")

        return self

    @property
    def is_development(self) -> bool:
        """Whether development-only conveniences can be enabled."""
        return self.app_env.lower() == "development"

    @property
    def cors_origin_list(self) -> list[str]:
        """Return validated, comma-separated browser origins."""
        origins = [origin.strip().rstrip("/") for origin in self.cors_origins.split(",") if origin.strip()]
        defaults = ["http://localhost:5173", "http://localhost:3000", "http://localhost:4173"]
        for d in defaults:
            if d not in origins:
                origins.append(d)
        return origins


@lru_cache
def get_settings() -> Settings:
    """Return one settings instance per process."""
    return Settings()
