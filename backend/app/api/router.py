"""Top-level API routing mapping."""

from fastapi import APIRouter

from app.api.conversations import router as conversations_router
from app.api.documents import router as documents_router
from app.api.generation import router as generation_router
from app.api.health import router as health_router
from app.api.dashboard import router as dashboard_router
from app.api.search import router as search_router

api_router = APIRouter()

api_router.include_router(health_router, tags=["health"])
api_router.include_router(conversations_router, tags=["conversations"])
api_router.include_router(dashboard_router, tags=["dashboard"])
api_router.include_router(documents_router, tags=["documents"])
api_router.include_router(search_router, tags=["search"])
api_router.include_router(generation_router, tags=["generation"])
