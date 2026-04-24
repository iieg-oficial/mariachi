"""add bucket_id to media

Revision ID: d1e2f3a4b5c6
Revises: c0d1e2f3a4b5
Create Date: 2026-04-24 21:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'd1e2f3a4b5c6'
down_revision = 'c0d1e2f3a4b5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'media',
        sa.Column('bucket_id', sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        'fk_media_bucket_id',
        'media',
        'media_buckets',
        ['bucket_id'],
        ['id'],
        ondelete='SET NULL',
    )
    op.create_index('ix_media_bucket_id', 'media', ['bucket_id'])

    conn = op.get_bind()
    conn.execute(
        sa.text("""
            UPDATE media
            SET bucket_id = (SELECT id FROM media_buckets WHERE acervo_bucket = 'portal' LIMIT 1)
            WHERE bucket_id IS NULL
        """)
    )


def downgrade() -> None:
    op.drop_index('ix_media_bucket_id', table_name='media')
    op.drop_constraint('fk_media_bucket_id', 'media', type_='foreignkey')
    op.drop_column('media', 'bucket_id')
