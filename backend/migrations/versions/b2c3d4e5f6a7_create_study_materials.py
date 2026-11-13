"""create_study_materials

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-11-13 23:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'study_materials',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('notebook_id', sa.UUID(), nullable=False),
        sa.Column('material_type', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('structured_content', sa.JSON(), nullable=True),
        sa.Column('generation_status', sa.String(length=50), nullable=False, server_default='completed'),
        sa.Column('configuration', sa.JSON(), nullable=True),
        sa.Column('source_references', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['notebook_id'], ['notebooks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_study_materials_notebook_id'), 'study_materials', ['notebook_id'], unique=False)
    op.create_index(op.f('ix_study_materials_material_type'), 'study_materials', ['material_type'], unique=False)
    op.create_index(op.f('ix_study_materials_generation_status'), 'study_materials', ['generation_status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_study_materials_generation_status'), table_name='study_materials')
    op.drop_index(op.f('ix_study_materials_material_type'), table_name='study_materials')
    op.drop_index(op.f('ix_study_materials_notebook_id'), table_name='study_materials')
    op.drop_table('study_materials')
