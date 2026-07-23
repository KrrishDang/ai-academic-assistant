"""API health check router."""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import get_settings
from app.db.session import engine

router = APIRouter()

@router.get("/health")
def health_check() -> dict:
    """Verify API application health, database connectivity, and telemetry."""
    settings = get_settings()
    
    # Check if Gemini API key is configured
    gemini_configured = bool(
        settings.google_api_key and settings.google_api_key.get_secret_value()
    )
    
    # Get storage backend type
    storage_type = settings.storage_backend

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        database_status = "connected"
    except SQLAlchemyError:
        database_status = "disconnected"

    response = {
        "status": "healthy" if database_status == "connected" else "unhealthy",
        "database": database_status,
        "gemini_configured": gemini_configured,
        "storage": storage_type,
        "version": "2.0.0"
    }

    if database_status != "connected":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=response,
        )

    return response
