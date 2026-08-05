"""Typed application settings loaded from environment variables."""

from functools import lru_cache
from typing import Any

import dotenv
# Force-load local environment variables, overriding conflicting system environment variables
dotenv.load_dotenv(override=True)

from pydantic import AliasChoices, Field, SecretStr, field_validator
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

    cors_origins: str = "http://localhost:5173"
    log_level: str = "INFO"
    session_secret: str = "generate-a-secure-secret-key-here"
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

    @property
    def is_development(self) -> bool:
        """Whether development-only conveniences can be enabled."""
        return self.app_env.lower() == "development"

    @property
    def cors_origin_list(self) -> list[str]:
        """Return validated, comma-separated browser origins."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Return one settings instance per process."""
    return Settings()
