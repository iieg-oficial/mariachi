"""convert reportes.tipo enum to string + backfill tipo_id

Revision ID: e2b3c4d5f6a7
Revises: e1a2b3c4d5f6
Create Date: 2026-07-23 12:00:00.000000

"""
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = 'e2b3c4d5f6a7'
down_revision = 'e1a2b3c4d5f6'
branch_labels = None
depends_on = None


_ENUM_VALUES = (
    'problema',
    'solicitud',
    'sugerencia',
    'duda',
    'datos_incorrectos',
    'bug',
)


def upgrade() -> None:
    op.alter_column(
        'reportes',
        'tipo',
        existing_type=postgresql.ENUM(*_ENUM_VALUES, name='reporte_tipo'),
        type_=sa.String(length=50),
        existing_nullable=False,
        postgresql_using='tipo::text',
    )
    op.execute('DROP TYPE IF EXISTS reporte_tipo')
    op.create_index('ix_reportes_tipo', 'reportes', ['tipo'])

    op.execute(
        """
        UPDATE reportes
        SET tipo_id = rt.id
        FROM reporte_tipos rt
        WHERE rt.slug = reportes.tipo
        AND reportes.tipo_id IS NULL
        """
    )


def downgrade() -> None:
    op.drop_index('ix_reportes_tipo', table_name='reportes')
    reporte_tipo = postgresql.ENUM(*_ENUM_VALUES, name='reporte_tipo')
    reporte_tipo.create(op.get_bind(), checkfirst=True)
    op.alter_column(
        'reportes',
        'tipo',
        existing_type=sa.String(length=50),
        type_=reporte_tipo,
        existing_nullable=False,
        postgresql_using='tipo::reporte_tipo',
    )
