"""rename media tables to acervo

Renombra tablas que sostienen la administracion del Acervo desde el CMS:
- media           -> acervo_files
- media_buckets   -> acervo_buckets
- media_folders   -> acervo_folders
- constraint uq_media_folders_bucket_path -> uq_acervo_folders_bucket_path

No mueve datos, solo ALTER TABLE RENAME (idempotente y reversible).

Revision ID: a7b8c9d0e1f2
Revises: c0d1e2f3a4b6
Create Date: 2026-05-25 00:00:00.000000

"""
from alembic import op


revision = 'a7b8c9d0e1f2'
down_revision = 'c0d1e2f3a4b6'
branch_labels = None
depends_on = None


_RENAMES = (
    ('media_buckets', 'acervo_buckets'),
    ('media_folders', 'acervo_folders'),
    ('media', 'acervo_files'),
)


def upgrade() -> None:
    for old, new in _RENAMES:
        op.execute(f'ALTER TABLE IF EXISTS {old} RENAME TO {new}')
    op.execute(
        'ALTER TABLE IF EXISTS acervo_folders '
        'RENAME CONSTRAINT uq_media_folders_bucket_path '
        'TO uq_acervo_folders_bucket_path'
    )


def downgrade() -> None:
    op.execute(
        'ALTER TABLE IF EXISTS acervo_folders '
        'RENAME CONSTRAINT uq_acervo_folders_bucket_path '
        'TO uq_media_folders_bucket_path'
    )
    for old, new in reversed(_RENAMES):
        op.execute(f'ALTER TABLE IF EXISTS {new} RENAME TO {old}')
