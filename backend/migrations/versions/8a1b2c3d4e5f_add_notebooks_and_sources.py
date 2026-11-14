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
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    # 1. Create notebooks table if not exists
    if 'notebooks' not in tables:
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

    # 2. Create sources table if not exists
    if 'sources' not in tables:
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

    # Re-inspect conversations columns, foreign keys, and indexes
    conv_columns = {col['name']: col for col in inspector.get_columns('conversations')}
    conv_fks = inspector.get_foreign_keys('conversations')
    conv_indexes = {idx['name'] for idx in inspector.get_indexes('conversations')}

    # 3. Handle user_id on conversations:
    # If user_id is missing (e.g. Railway V1 database), add it as nullable UUID
    # referencing users.id with ON DELETE CASCADE and create its index.
    if 'user_id' not in conv_columns:
        op.add_column('conversations', sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True))
        op.create_foreign_key(
            'fk_conversations_user_id',
            'conversations',
            'users',
            ['user_id'],
            ['id'],
            ondelete='CASCADE'
        )
        op.create_index(op.f('ix_conversations_user_id'), 'conversations', ['user_id'], unique=False)
    else:
        # If user_id exists, ensure it is nullable to support anonymous visitor sessions
        if not conv_columns['user_id']['nullable']:
            op.alter_column('conversations', 'user_id', existing_type=postgresql.UUID(as_uuid=True), nullable=True)
        # Ensure foreign key to users.id exists
        has_user_fk = any('user_id' in fk.get('constrained_columns', []) for fk in conv_fks)
        if not has_user_fk:
            op.create_foreign_key(
                'fk_conversations_user_id',
                'conversations',
                'users',
                ['user_id'],
                ['id'],
                ondelete='CASCADE'
            )
        # Ensure index exists
        idx_name = op.f('ix_conversations_user_id')
        if idx_name not in conv_indexes:
            op.create_index(idx_name, 'conversations', ['user_id'], unique=False)

    # 4. Handle notebook_id on conversations:
    # Add notebook_id if not present, link to notebooks.id with ON DELETE CASCADE and index
    if 'notebook_id' not in conv_columns:
        op.add_column('conversations', sa.Column('notebook_id', postgresql.UUID(as_uuid=True), nullable=True))
        op.create_foreign_key(
            'fk_conversations_notebook_id',
            'conversations',
            'notebooks',
            ['notebook_id'],
            ['id'],
            ondelete='CASCADE'
        )
        op.create_index(op.f('ix_conversations_notebook_id'), 'conversations', ['notebook_id'], unique=False)
    else:
        has_nb_fk = any('notebook_id' in fk.get('constrained_columns', []) for fk in conv_fks)
        if not has_nb_fk:
            op.create_foreign_key(
                'fk_conversations_notebook_id',
                'conversations',
                'notebooks',
                ['notebook_id'],
                ['id'],
                ondelete='CASCADE'
            )
        idx_name = op.f('ix_conversations_notebook_id')
        if idx_name not in conv_indexes:
            op.create_index(idx_name, 'conversations', ['notebook_id'], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if 'conversations' in tables:
        conv_columns = {col['name']: col for col in inspector.get_columns('conversations')}
        conv_fks = {fk.get('name'): fk for fk in inspector.get_foreign_keys('conversations')}
        conv_indexes = {idx['name'] for idx in inspector.get_indexes('conversations')}

        # Drop notebook_id constraint, index, and column
        if op.f('ix_conversations_notebook_id') in conv_indexes:
            op.drop_index(op.f('ix_conversations_notebook_id'), table_name='conversations')
        if 'fk_conversations_notebook_id' in conv_fks:
            op.drop_constraint('fk_conversations_notebook_id', 'conversations', type_='foreignkey')
        if 'notebook_id' in conv_columns:
            op.drop_column('conversations', 'notebook_id')

        # Review user_id downgrade:
        # Never drop pre-existing columns or constraints unintentionally.
        # If user_id exists and is nullable, only attempt to revert nullability if there are no NULL values.
        if 'user_id' in conv_columns and conv_columns['user_id']['nullable']:
            null_count = bind.execute(sa.text("SELECT COUNT(*) FROM conversations WHERE user_id IS NULL")).scalar()
            if null_count == 0:
                op.alter_column('conversations', 'user_id', existing_type=postgresql.UUID(as_uuid=True), nullable=False)

    # Drop sources table if present
    if 'sources' in tables:
        sources_indexes = {idx['name'] for idx in inspector.get_indexes('sources')}
        if op.f('ix_sources_processing_status') in sources_indexes:
            op.drop_index(op.f('ix_sources_processing_status'), table_name='sources')
        if op.f('ix_sources_content_hash') in sources_indexes:
            op.drop_index(op.f('ix_sources_content_hash'), table_name='sources')
        if op.f('ix_sources_notebook_id') in sources_indexes:
            op.drop_index(op.f('ix_sources_notebook_id'), table_name='sources')
        op.drop_table('sources')

    # Drop notebooks table if present
    if 'notebooks' in tables:
        nb_indexes = {idx['name'] for idx in inspector.get_indexes('notebooks')}
        if op.f('ix_notebooks_user_id') in nb_indexes:
            op.drop_index(op.f('ix_notebooks_user_id'), table_name='notebooks')
        op.drop_table('notebooks')
