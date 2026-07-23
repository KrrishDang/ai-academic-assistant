"""Pydantic schemas for dashboard statistics and activity metrics."""

import uuid
from datetime import datetime
from typing import List

from pydantic import BaseModel

from app.schemas.conversation import ConversationResponse
from app.schemas.document import DocumentResponse


class ActivityResponse(BaseModel):
    """Details of a single activity event."""

    id: uuid.UUID
    type: str  # 'document' or 'conversation'
    title: str
    action: str
    timestamp: datetime


class DashboardStatsResponse(BaseModel):
    """Statistics and recent logs for the overview dashboard."""

    total_documents: int
    total_conversations: int
    total_ai_generations: int
    recent_conversations: List[ConversationResponse]
    recent_documents: List[DocumentResponse]
    recent_activities: List[ActivityResponse]
