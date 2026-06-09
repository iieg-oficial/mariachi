from alembic import op
import sqlalchemy as sa


revision = 'd9e0f1a2b3c4'
down_revision = 'c2d3e4f5a6b7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text("""
            DELETE FROM acervo_folders f
            WHERE NOT EXISTS (
                SELECT 1 FROM acervo_files af
                WHERE af.bucket_id = f.bucket_id
                  AND trim(both '/' from af.folder) = trim(both '/' from f.path)
            )
        """)
    )

    op.execute(
        sa.text("""
            DELETE FROM acervo_folders a
            USING acervo_folders b
            WHERE a.bucket_id = b.bucket_id
              AND trim(both '/' from a.path) = trim(both '/' from b.path)
              AND a.id > b.id
        """)
    )

    op.execute(
        sa.text("""
            UPDATE acervo_folders
            SET path = trim(both '/' from path) || '/'
            WHERE path <> trim(both '/' from path) || '/'
        """)
    )

    op.execute(
        sa.text("""
            UPDATE acervo_folders
            SET parent = CASE
                WHEN trim(both '/' from coalesce(parent, '')) = '' THEN NULL
                ELSE trim(both '/' from parent) || '/'
            END
            WHERE parent IS NOT NULL
        """)
    )


def downgrade() -> None:
    pass
