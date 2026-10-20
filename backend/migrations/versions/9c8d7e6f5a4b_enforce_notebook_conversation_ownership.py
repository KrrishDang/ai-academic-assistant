"""enforce_notebook_conversation_ownership

Revision ID: 9c8d7e6f5a4b
Revises: 8a1b2c3d4e5f
Create Date: 2026-10-20 20:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9c8d7e6f5a4b'
down_revision: Union[str, Sequence[str], None] = '8a1b2c3d4e5f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add unique constraint on notebooks(id, user_id) to permit composite FK referencing
    op.create_unique_constraint('uq_notebooks_id_user_id', 'notebooks', ['id', 'user_id'])

    # 2. Add composite foreign key constraint enforcing Conversation.user_id matches Notebook.user_id
    op.create_foreign_key(
        'fk_conversations_notebook_user',
        'conversations',
        'notebooks',
        ['notebook_id', 'user_id'],
        ['id', 'user_id'],
        ondelete='CASCADE',
    )

    # 3. Add check constraint ensuring notebook conversations have non-null user_id
    op.create_check_constraint(
        'ck_conversations_notebook_user',
        'conversations',
        'notebook_id IS NULL OR user_id IS NOT NULL',
    )


def downgrade() -> None:
    op.drop_constraint('ck_conversations_notebook_user', 'conversations', type_='check')
    op.drop_constraint('fk_conversations_notebook_user', 'conversations', type_='foreignkey')
    op.drop_constraint('uq_notebooks_id_user_id', 'notebooks', type_='unique')
