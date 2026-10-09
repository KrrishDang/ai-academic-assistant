"""add_notebooks_and_sources

Revision ID: 8a1b2c3d4e5f
Revises: 7a9b8c7d6e5f
Create Date: 2026-10-09 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '8a1b2c3d4e5f'
down_revision: Union[str, Sequence[str], None] = '7a9b8c7d6e5f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create notebooks table
    op.create_table(
        'notebooks',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notebooks_user_id'), 'notebooks', ['user_id'], unique=False)

    # Create sources table
    op.create_table(
        'sources',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('notebook_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('source_type', sa.String(length=50), nullable=False),
        sa.Column('original_filename', sa.String(length=255), nullable=True),
        sa.Column('display_title', sa.String(length=255), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=True),
        sa.Column('file_size_bytes', sa.BigInteger(), nullable=True),
        sa.Column('content_hash', sa.String(length=64), nullable=True),
        sa.Column('processing_status', sa.String(length=50), server_default='pending', nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('storage_key', sa.String(length=512), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['notebook_id'], ['notebooks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sources_notebook_id'), 'sources', ['notebook_id'], unique=False)
    op.create_index(op.f('ix_sources_content_hash'), 'sources', ['content_hash'], unique=False)
    op.create_index(op.f('ix_sources_processing_status'), 'sources', ['processing_status'], unique=False)

    # Make user_id nullable in conversations table to support anonymous conversations
    op.alter_column('conversations', 'user_id', existing_type=postgresql.UUID(as_uuid=True), nullable=True)

    # Add notebook_id to conversations table
    op.add_column('conversations', sa.Column('notebook_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key('fk_conversations_notebook_id', 'conversations', 'notebooks', ['notebook_id'], ['id'], ondelete='CASCADE')
    op.create_index(op.f('ix_conversations_notebook_id'), 'conversations', ['notebook_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_conversations_notebook_id'), table_name='conversations')
    op.drop_constraint('fk_conversations_notebook_id', 'conversations', type_='foreignkey')
    op.drop_column('conversations', 'notebook_id')

    op.alter_column('conversations', 'user_id', existing_type=postgresql.UUID(as_uuid=True), nullable=False)

    op.drop_index(op.f('ix_sources_processing_status'), table_name='sources')
    op.drop_index(op.f('ix_sources_content_hash'), table_name='sources')
    op.drop_index(op.f('ix_sources_notebook_id'), table_name='sources')
    op.drop_table('sources')

    op.drop_index(op.f('ix_notebooks_user_id'), table_name='notebooks')
    op.drop_table('notebooks')
