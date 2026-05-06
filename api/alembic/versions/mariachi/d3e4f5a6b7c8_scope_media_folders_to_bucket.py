"""scope media_folders to bucket

Revision ID: d3e4f5a6b7c8
Revises: c4d5e6f7a8b9
Create Date: 2026-05-06 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'd3e4f5a6b7c8'
down_revision = 'c4d5e6f7a8b9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE media DROP CONSTRAINT IF EXISTS media_folder_fkey")

    op.add_column(
        'media_folders',
        sa.Column('bucket_id', sa.Integer(), nullable=True),
    )

    conn = op.get_bind()

    conn.execute(sa.text("""
        UPDATE media_folders mf
        SET bucket_id = sub.bucket_id
        FROM (
            SELECT m.folder AS path,
                   (ARRAY_AGG(m.bucket_id ORDER BY count DESC, m.bucket_id))[1] AS bucket_id
            FROM (
                SELECT folder, bucket_id, COUNT(*) AS count
                FROM media
                WHERE bucket_id IS NOT NULL AND folder IS NOT NULL
                GROUP BY folder, bucket_id
            ) AS m
            GROUP BY m.folder
        ) AS sub
        WHERE mf.path = sub.path
    """))

    fallback_bucket_id = conn.execute(sa.text("""
        SELECT id FROM media_buckets
        WHERE acervo_bucket = 'portal' AND is_active = TRUE
        LIMIT 1
    """)).scalar()
    if fallback_bucket_id is None:
        fallback_bucket_id = conn.execute(sa.text("""
            SELECT id FROM media_buckets WHERE is_active = TRUE
            ORDER BY id LIMIT 1
        """)).scalar()

    if fallback_bucket_id is not None:
        conn.execute(
            sa.text("UPDATE media_folders SET bucket_id = :bid WHERE bucket_id IS NULL")
            .bindparams(bid=fallback_bucket_id)
        )
    else:
        conn.execute(sa.text("DELETE FROM media_folders WHERE bucket_id IS NULL"))

    op.alter_column('media_folders', 'bucket_id', nullable=False)
    op.create_foreign_key(
        'fk_media_folders_bucket_id',
        'media_folders',
        'media_buckets',
        ['bucket_id'],
        ['id'],
        ondelete='CASCADE',
    )
    op.create_index('ix_media_folders_bucket_id', 'media_folders', ['bucket_id'])

    op.execute("DROP INDEX IF EXISTS ix_media_folders_path")

    op.execute("""
        DELETE FROM media_folders a
        USING media_folders b
        WHERE a.id > b.id
          AND a.bucket_id = b.bucket_id
          AND a.path = b.path
    """)

    op.create_index('ix_media_folders_path', 'media_folders', ['path'], unique=False)
    op.create_unique_constraint(
        'uq_media_folders_bucket_path',
        'media_folders',
        ['bucket_id', 'path'],
    )


def downgrade() -> None:
    op.drop_constraint(
        'uq_media_folders_bucket_path',
        'media_folders',
        type_='unique',
    )
    op.drop_index('ix_media_folders_path', table_name='media_folders')
    op.drop_index('ix_media_folders_bucket_id', table_name='media_folders')
    op.drop_constraint(
        'fk_media_folders_bucket_id',
        'media_folders',
        type_='foreignkey',
    )
    op.drop_column('media_folders', 'bucket_id')
    op.create_index('ix_media_folders_path', 'media_folders', ['path'], unique=True)
    op.create_foreign_key(
        'media_folder_fkey',
        'media',
        'media_folders',
        ['folder'],
        ['path'],
    )
