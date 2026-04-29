from alembic import op
import sqlalchemy as sa


revision = 'a1b2c3d4e5f6'
down_revision = 'f4a5b6c7d8e9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text("""
            INSERT INTO projects (slug, name, description, is_active, created_at)
            VALUES
                ('mariachi', 'Mariachi', 'Panel de administracion del ecosistema IIEG', true, NOW()),
                ('iieg',     'IIEG',     'Assets institucionales compartidos (logos, fuentes, iconos)', true, NOW())
            ON CONFLICT (slug) DO NOTHING
        """)
    )

    op.execute(
        sa.text("""
            INSERT INTO media_buckets (project_id, acervo_bucket, access_key_ref, display_name, is_public, is_active, created_at)
            SELECT p.id, b.acervo_bucket, b.access_key_ref, b.display_name, b.is_public, true, NOW()
            FROM (VALUES
                ('mariachi', 'mariachi', 'ACERVO_MARIACHI', 'Assets administrativos privados', false),
                ('iieg',     'iieg',     'ACERVO_IIEG',     'Assets institucionales IIEG (avatars genericos)', true)
            ) AS b(project_slug, acervo_bucket, access_key_ref, display_name, is_public)
            JOIN projects p ON p.slug = b.project_slug
            ON CONFLICT DO NOTHING
        """)
    )

    op.execute(
        sa.text("""
            UPDATE media_buckets
            SET acervo_bucket = 'dataengine',
                access_key_ref = 'ACERVO_DATAENGINE',
                is_active = false
            WHERE acervo_bucket = 'dateengine'
        """)
    )

    op.execute(
        sa.text("""
            UPDATE media_buckets
            SET acervo_bucket = 'sieej'
            WHERE acervo_bucket = 'sieej-diccionarios'
        """)
    )


def downgrade() -> None:
    op.execute(
        sa.text("""
            UPDATE media_buckets
            SET acervo_bucket = 'sieej-diccionarios'
            WHERE acervo_bucket = 'sieej'
        """)
    )

    op.execute(
        sa.text("""
            UPDATE media_buckets
            SET acervo_bucket = 'dateengine',
                access_key_ref = 'ACERVO_DATEENGINE',
                is_active = true
            WHERE acervo_bucket = 'dataengine'
        """)
    )

    op.execute(
        sa.text("""
            DELETE FROM media_buckets
            WHERE acervo_bucket IN ('mariachi', 'iieg')
        """)
    )

    op.execute(
        sa.text("""
            DELETE FROM projects WHERE slug IN ('mariachi', 'iieg')
        """)
    )
