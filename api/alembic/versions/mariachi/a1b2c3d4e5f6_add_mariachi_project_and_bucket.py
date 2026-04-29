"""add mariachi project + bucket; rename dateengine -> dataengine + deactivate

Revision ID: a1b2c3d4e5f6
Revises: f4a5b6c7d8e9
Create Date: 2026-04-29 17:00:00.000000

Mariachi gana su propio proyecto y bucket en acervo para guardar avatars y
otros assets internos del panel admin. Antes mariachi escribia con las creds
root de MinIO (fallback de acervo.py); ahora escribe con `mariachi-user` que
solo tiene permisos sobre el bucket `mariachi`.

El bucket historico `dateengine` (con typo) se renombra a `dataengine` y
queda desactivado: mariachi nunca lo usa en runtime, pero corregimos el
nombre por higiene y consistencia con el patron de otros repos. La
contraparte en MinIO la hace `acervo/scripts/init-buckets.sh` (>= acervo
1.19.0): detecta el bucket viejo, migra objetos al nuevo y elimina el
viejo.
"""

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
            VALUES ('mariachi', 'Mariachi', 'Panel de administracion del ecosistema IIEG', true, NOW())
            ON CONFLICT (slug) DO NOTHING
        """)
    )

    op.execute(
        sa.text("""
            INSERT INTO media_buckets (project_id, acervo_bucket, access_key_ref, display_name, is_public, is_active, created_at)
            SELECT p.id, 'mariachi', 'ACERVO_MARIACHI', 'Assets de Mariachi', true, true, NOW()
            FROM projects p
            WHERE p.slug = 'mariachi'
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


def downgrade() -> None:
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
            WHERE acervo_bucket = 'mariachi'
        """)
    )

    op.execute(
        sa.text("""
            DELETE FROM projects WHERE slug = 'mariachi'
        """)
    )
