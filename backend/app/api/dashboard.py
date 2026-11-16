"""Dashboard statistics and overview API router."""

from datetime import datetime, timezone as tz
from typing import Annotated

from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from app.api.deps import get_optional_current_user
from app.db.session import get_db_session
from app.models.conversation import Conversation, Message
from app.models.document import Document
from app.models.user import User
from app.schemas.dashboard import DashboardStatsResponse

router = APIRouter(prefix="/dashboard")


def _ensure_tz_aware(dt):
    """Normalize a datetime to UTC-aware. Handles None and naive datetimes."""
    if dt is None:
        return datetime.min.replace(tzinfo=tz.utc)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=tz.utc)
    return dt


@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(
    x_session_id: str | None = Header(None, alias="X-Session-ID"),
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
    db: Session = Depends(get_db_session),
) -> dict:
    """Retrieve summarized workspace usage metrics and recent activity streams."""
    if not current_user:
        return {
            "total_documents": 0,
            "total_conversations": 0,
            "total_ai_generations": 0,
            "recent_conversations": [],
            "recent_documents": [],
            "recent_activities": [],
        }

    doc_query = db.query(Document).filter(Document.user_id == current_user.id)
    conv_query = db.query(Conversation).filter(Conversation.user_id == current_user.id)
    msg_query = (
        db.query(Message)
        .join(Conversation, Message.conversation_id == Conversation.id)
        .filter(Conversation.user_id == current_user.id)
    )

    total_docs = doc_query.count()
    total_convs = conv_query.count()

    total_ai = (
        msg_query
        .filter((Message.role == "assistant") | (Message.role == "model"))
        .count()
    )

    recent_convs = (
        conv_query
        .order_by(Conversation.updated_at.desc())
        .limit(5)
        .all()
    )

    recent_docs = (
        doc_query
        .order_by(Document.created_at.desc())
        .limit(5)
        .all()
    )

    # Combine documents and conversations into a unified recent activity list
    activities = []
    for doc in recent_docs:
        activities.append({
            "id": doc.id,
            "type": "document",
            "title": doc.original_filename,
            "action": "Uploaded PDF notes",
            "timestamp": _ensure_tz_aware(doc.created_at),
        })
    for conv in recent_convs:
        activities.append({
            "id": conv.id,
            "type": "conversation",
            "title": conv.title,
            "action": "Started AI chat",
            "timestamp": _ensure_tz_aware(conv.created_at),
        })

    # Sort recent activities by timestamp descending cleanly
    activities.sort(key=lambda x: x["timestamp"], reverse=True)
    recent_activities = activities[:6]

    return {
        "total_documents": total_docs,
        "total_conversations": total_convs,
        "total_ai_generations": total_ai,
        "recent_conversations": recent_convs,
        "recent_documents": recent_docs,
        "recent_activities": recent_activities,
    }
