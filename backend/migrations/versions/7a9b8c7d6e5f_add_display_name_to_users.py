"""add_display_name_to_users

Revision ID: 7a9b8c7d6e5f
Revises: 61a84f3e9b10
Create Date: 2026-10-09 20:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a9b8c7d6e5f'
down_revision: Union[str, Sequence[str], None] = '61a84f3e9b10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add display_name column to users table."""
    op.add_column('users', sa.Column('display_name', sa.String(length=255), nullable=True))


def downgrade() -> None:
    """Remove display_name column from users table."""
    op.drop_column('users', 'display_name')
