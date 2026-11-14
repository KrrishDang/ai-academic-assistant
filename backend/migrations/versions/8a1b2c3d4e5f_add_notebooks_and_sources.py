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


def _validate_or_create_fk(
    table_name: str,
    column_name: str,
    expected_table: str,
    expected_col: str,
    expected_ondelete: str,
    existing_fks: list,
    fk_name: str,
) -> None:
    """Validate that an existing FK on column_name references expected target with expected ondelete,
    or create it if missing. Avoids duplicate constraints and stops on unexpected FK definitions.
    """
    for fk in existing_fks:
        if fk.get("constrained_columns") == [column_name]:
            ref_table = fk.get("referred_table")
            ref_cols = fk.get("referred_columns")
            opts = fk.get("options", {}) or {}
            ondelete = (opts.get("ondelete") or "").upper()

            if ref_table == expected_table and ref_cols == [expected_col]:
                if ondelete == expected_ondelete.upper():
                    # Exactly matches expected relationship and ON DELETE cascade behavior
                    return
                else:
                    raise RuntimeError(
                        f"Existing foreign key '{fk.get('name')}' on {table_name}.{column_name} "
                        f"references {ref_table}.{ref_cols} with ON DELETE {ondelete}, "
                        f"expected ON DELETE {expected_ondelete.upper()}. "
                        f"Cannot safely replace without manual verification."
                    )
            else:
                raise RuntimeError(
                    f"Unexpected foreign key '{fk.get('name')}' on {table_name}.{column_name} "
                    f"references {ref_table}.{ref_cols}, expected {expected_table}.{expected_col}. "
                    f"Cannot safely replace without manual verification."
                )

    # Missing: safely create the expected foreign key
    op.create_foreign_key(
        fk_name,
        table_name,
        expected_table,
        [column_name],
        [expected_col],
        ondelete=expected_ondelete,
    )


def _ensure_index(table_name: str, column_name: str, idx_name: str, existing_indexes: list) -> None:
    """Ensure an index on column_name exists, avoiding duplicates by column or name."""
    for idx in existing_indexes:
        if idx.get("column_names") == [column_name] or idx.get("name") == idx_name:
            return
    op.create_index(idx_name, table_name, [column_name], unique=False)


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
    conv_indexes = inspector.get_indexes('conversations')

    # 3. Handle user_id on conversations:
    # If user_id is missing (e.g. Railway V1 database), add it as nullable UUID
    # referencing users.id with ON DELETE CASCADE and create its index.
    if 'user_id' not in conv_columns:
        op.add_column('conversations', sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True))
    else:
        # If user_id exists, ensure it is nullable to support anonymous visitor sessions
        if not conv_columns['user_id']['nullable']:
            op.alter_column('conversations', 'user_id', existing_type=postgresql.UUID(as_uuid=True), nullable=True)

    # Ensure foreign key to users.id exists with ON DELETE CASCADE
    _validate_or_create_fk(
        table_name='conversations',
        column_name='user_id',
        expected_table='users',
        expected_col='id',
        expected_ondelete='CASCADE',
        existing_fks=conv_fks,
        fk_name='fk_conversations_user_id',
    )
    _ensure_index(
        table_name='conversations',
        column_name='user_id',
        idx_name=op.f('ix_conversations_user_id'),
        existing_indexes=conv_indexes,
    )

    # 4. Handle notebook_id on conversations:
    # Add notebook_id if not present, link to notebooks.id with ON DELETE CASCADE and index
    if 'notebook_id' not in conv_columns:
        op.add_column('conversations', sa.Column('notebook_id', postgresql.UUID(as_uuid=True), nullable=True))

    # Ensure foreign key to notebooks.id exists with ON DELETE CASCADE
    _validate_or_create_fk(
        table_name='conversations',
        column_name='notebook_id',
        expected_table='notebooks',
        expected_col='id',
        expected_ondelete='CASCADE',
        existing_fks=conv_fks,
        fk_name='fk_conversations_notebook_id',
    )
    _ensure_index(
        table_name='conversations',
        column_name='notebook_id',
        idx_name=op.f('ix_conversations_notebook_id'),
        existing_indexes=conv_indexes,
    )


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

        # Note on conversations.user_id downgrade:
        # conversations.user_id is intentionally retained as nullable and never dropped or altered to NOT NULL.
        # Because Alembic does not record whether conversations.user_id pre-existed before this migration
        # (e.g. from 53013a0468a4) or was added to support a legacy Railway V1 schema lacking user_id,
        # dropping the column could cause catastrophic data loss on databases where user_id was pre-existing,
        # and altering to NOT NULL would break anonymous visitor sessions (user_id IS NULL).
        # Retaining user_id as nullable safely preserves all existing conversation rows and anonymous sessions.

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
