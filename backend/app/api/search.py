"""Global workspace search API router."""

from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.models.conversation import Conversation, Message
from app.models.document import Document
from app.schemas.search import SearchResultsResponse

router = APIRouter(prefix="/search")

@router.get("", response_model=SearchResultsResponse)
def global_search(
    q: str = Query(..., min_length=1),
    x_session_id: str | None = Header(None, alias="X-Session-ID"),
    db: Session = Depends(get_db_session),
) -> dict:
    """Perform a query matching documents, chat titles, and historical message exchanges."""
    doc_query = db.query(Document).filter(Document.original_filename.ilike(f"%{q}%"))
    conv_query = db.query(Conversation).filter(Conversation.title.ilike(f"%{q}%"))
    msg_query = db.query(Message).join(Conversation).filter(Message.content.ilike(f"%{q}%"))

    if x_session_id:
        doc_query = doc_query.filter((Document.session_id == x_session_id) | (Document.session_id.is_(None)))
        conv_query = conv_query.filter((Conversation.session_id == x_session_id) | (Conversation.session_id.is_(None)))
        msg_query = msg_query.filter((Conversation.session_id == x_session_id) | (Conversation.session_id.is_(None)))

    docs = doc_query.all()
    convs = conv_query.all()
    msgs = msg_query.all()

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
