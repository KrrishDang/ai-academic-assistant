"""add_extracted_text_to_sources

Revision ID: a1b2c3d4e5f6
Revises: 9c8d7e6f5a4b
Create Date: 2026-11-13 22:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '9c8d7e6f5a4b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('sources', sa.Column('extracted_text', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('sources', 'extracted_text')
