"""add_session_id_to_documents_and_conversations

Revision ID: 61a84f3e9b10
Revises: 20d81b1b5bec
Create Date: 2026-08-20 12:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '61a84f3e9b10'
down_revision: Union[str, Sequence[str], None] = '20d81b1b5bec'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add session_id columns and indexes to documents and conversations tables."""
    op.add_column('documents', sa.Column('session_id', sa.String(length=64), nullable=True))
    op.create_index(op.f('ix_documents_session_id'), 'documents', ['session_id'], unique=False)
    op.add_column('conversations', sa.Column('session_id', sa.String(length=64), nullable=True))
    op.create_index(op.f('ix_conversations_session_id'), 'conversations', ['session_id'], unique=False)


def downgrade() -> None:
    """Remove session_id columns and indexes from documents and conversations tables."""
    op.drop_index(op.f('ix_conversations_session_id'), table_name='conversations')
    op.drop_column('conversations', 'session_id')
    op.drop_index(op.f('ix_documents_session_id'), table_name='documents')
    op.drop_column('documents', 'session_id')
