"""simplify bucket display_names

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-04-29 19:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


_NEW_NAMES = {
    'portal': 'Portal',
    'mapalab': 'MapaLab',
    'mariachi': 'Mariachi',
    'sieej': 'SIEEJ',
    'iieg': 'IIEG',
    'dataengine': 'DataEngine',
}

_OLD_NAMES = {
    'portal': 'Assets del Portal',
    'mapalab': 'Metadatos de capas',
    'mariachi': 'Assets administrativos privados',
    'sieej': 'Diccionarios de bases de datos SIEEJ',
    'iieg': 'Assets institucionales IIEG (avatars genericos)',
    'dataengine': 'Datos geoespaciales',
}


def upgrade() -> None:
    for bucket, name in _NEW_NAMES.items():
        op.execute(
            sa.text("UPDATE media_buckets SET display_name = :name WHERE acervo_bucket = :bucket")
            .bindparams(name=name, bucket=bucket)
        )


def downgrade() -> None:
    for bucket, name in _OLD_NAMES.items():
        op.execute(
            sa.text("UPDATE media_buckets SET display_name = :name WHERE acervo_bucket = :bucket")
            .bindparams(name=name, bucket=bucket)
        )
