"""Dashboard statistics and overview API router."""

from datetime import datetime, timezone as tz

from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.models.conversation import Conversation, Message
from app.models.document import Document
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
    db: Session = Depends(get_db_session),
) -> dict:
    """Retrieve summarized workspace usage metrics and recent activity streams."""
    doc_query = db.query(Document)
    conv_query = db.query(Conversation)
    msg_query = db.query(Message).join(Conversation)

    if x_session_id:
        doc_query = doc_query.filter((Document.session_id == x_session_id) | (Document.session_id.is_(None)))
        conv_query = conv_query.filter((Conversation.session_id == x_session_id) | (Conversation.session_id.is_(None)))
        msg_query = msg_query.filter((Conversation.session_id == x_session_id) | (Conversation.session_id.is_(None)))

    total_docs = doc_query.count()
    total_convs = conv_query.count()

    total_ai = (
        msg_query
        .filter(Message.role == "assistant")
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
