"""Global workspace search API router."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.models.conversation import Conversation, Message
from app.models.document import Document
from app.schemas.search import SearchResultsResponse

router = APIRouter(prefix="/search")

@router.get("", response_model=SearchResultsResponse)
def global_search(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db_session),
) -> dict:
    """Perform a query matching documents, chat titles, and historical message exchanges."""
    # Find matching documents
    docs = (
        db.query(Document)
        .filter(Document.original_filename.ilike(f"%{q}%"))
        .all()
    )

    # Find matching conversations
    convs = (
        db.query(Conversation)
        .filter(Conversation.title.ilike(f"%{q}%"))
        .all()
    )

    # Find matching messages
    msgs = (
        db.query(Message)
        .join(Conversation)
        .filter(Message.content.ilike(f"%{q}%"))
        .all()
    )

    # Format message results to link back to parent titles
    message_results = []
    for m in msgs:
        message_results.append({
            "id": m.id,
            "conversation_id": m.conversation_id,
            "role": m.role,
            "content": m.content,
            "conversation_title": m.conversation.title,
        })

    return {
        "documents": docs,
        "conversations": convs,
        "messages": message_results,
    }
