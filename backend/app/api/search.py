"""Global workspace search API router."""

from typing import Annotated

from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.orm import Session

from app.api.deps import get_optional_current_user
from app.db.session import get_db_session
from app.models.conversation import Conversation, Message
from app.models.document import Document
from app.models.user import User
from app.schemas.search import SearchResultsResponse

router = APIRouter(prefix="/search")

@router.get("", response_model=SearchResultsResponse)
def global_search(
    q: str = Query(..., min_length=1),
    x_session_id: str | None = Header(None, alias="X-Session-ID"),
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
    db: Session = Depends(get_db_session),
) -> dict:
    """Perform a query matching documents, chat titles, and historical message exchanges."""
    if not current_user:
        return {
            "documents": [],
            "conversations": [],
            "messages": [],
        }

    doc_query = (
        db.query(Document)
        .filter(Document.user_id == current_user.id, Document.original_filename.ilike(f"%{q}%"))
    )
    conv_query = (
        db.query(Conversation)
        .filter(Conversation.user_id == current_user.id, Conversation.title.ilike(f"%{q}%"))
    )
    msg_query = (
        db.query(Message)
        .join(Conversation, Message.conversation_id == Conversation.id)
        .filter(Conversation.user_id == current_user.id, Message.content.ilike(f"%{q}%"))
    )

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
