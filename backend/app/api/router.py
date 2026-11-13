"""Top-level API routing mapping."""

from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.conversations import router as conversations_router
from app.api.documents import router as documents_router
from app.api.generation import router as generation_router
from app.api.health import router as health_router
from app.api.dashboard import router as dashboard_router
from app.api.search import router as search_router
from app.api.notebooks import router as notebooks_router
from app.api.sources import router as sources_router
from app.api.study_materials import (
    notebook_study_router,
    study_materials_router,
)

api_router = APIRouter()

api_router.include_router(health_router, tags=["health"])
api_router.include_router(auth_router, tags=["auth"])
api_router.include_router(notebooks_router, tags=["notebooks"])
api_router.include_router(notebook_study_router, tags=["study-studio"])
api_router.include_router(sources_router, tags=["sources"])
api_router.include_router(study_materials_router, tags=["study-materials"])
api_router.include_router(conversations_router, tags=["conversations"])
api_router.include_router(dashboard_router, tags=["dashboard"])
api_router.include_router(documents_router, tags=["documents"])
api_router.include_router(search_router, tags=["search"])
api_router.include_router(generation_router, tags=["generation"])
