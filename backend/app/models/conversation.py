import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    String,
    Text,
    event,
    select,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, validates

from app.db.session import Base
from app.models.notebook import Notebook


class Conversation(Base):
    """Database model representing a chat conversation."""

    __tablename__ = "conversations"
    __table_args__ = (
        ForeignKeyConstraint(
            ["notebook_id", "user_id"],
            ["notebooks.id", "notebooks.user_id"],
            ondelete="CASCADE",
            name="fk_conversations_notebook_user",
        ),
        CheckConstraint(
            "notebook_id IS NULL OR user_id IS NOT NULL",
            name="ck_conversations_notebook_user",
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True, index=True)
    notebook_id = Column(UUID(as_uuid=True), ForeignKey("notebooks.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    session_id = Column(String(64), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    document = relationship("Document", back_populates="conversations")
    notebook = relationship(
        "Notebook",
        back_populates="conversations",
        foreign_keys="[Conversation.notebook_id]",
    )
    user = relationship("User", backref="conversations")
    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )

    @validates("notebook_id", "user_id")
    def validate_notebook_user_consistency(self, key: str, value):
        """Ensure in-memory conversation user_id matches attached notebook owner."""
        if key == "notebook_id":
            if value is not None and self.user_id is not None and self.notebook is not None:
                if self.notebook.user_id != self.user_id:
                    raise ValueError("Conversation user_id must match notebook owner user_id")
        elif key == "user_id":
            if value is not None and self.notebook is not None:
                if self.notebook.user_id != value:
                    raise ValueError("Conversation user_id must match notebook owner user_id")
        return value


@event.listens_for(Conversation, "before_insert")
@event.listens_for(Conversation, "before_update")
def check_conversation_ownership_consistency(mapper, connection, target: Conversation):
    """Enforce notebook-conversation user ownership invariant prior to flush/commit."""
    if target.notebook_id is not None:
        if target.user_id is None:
            raise ValueError("Notebook conversation must have a user_id")
        nb_user_id = connection.execute(
            select(Notebook.user_id).where(Notebook.id == target.notebook_id)
        ).scalar_one_or_none()
        if nb_user_id is not None and nb_user_id != target.user_id:
            raise ValueError(
                f"Conversation user_id ({target.user_id}) does not match notebook owner ({nb_user_id})"
            )


class Message(Base):
    """Database model representing a single chat message inside a conversation."""

    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(50), nullable=False)  # 'user' or 'model'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    conversation = relationship("Conversation", back_populates="messages")
