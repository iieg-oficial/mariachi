"""add reportes table

Revision ID: c4d5e6f7a8b9
Revises: b2c3d4e5f6a7
Create Date: 2026-05-04 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'c4d5e6f7a8b9'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("DROP TYPE IF EXISTS reporte_tipo CASCADE")
    op.execute("DROP TYPE IF EXISTS reporte_estado CASCADE")

    reporte_tipo = sa.Enum(
        'problema', 'solicitud', 'sugerencia', 'duda', 'datos_incorrectos', 'bug',
        name='reporte_tipo',
    )
    reporte_estado = sa.Enum(
        'nuevo', 'en_revision', 'resuelto', 'descartado',
        name='reporte_estado',
    )

    op.create_table(
        'reportes',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('tipo', reporte_tipo, nullable=False),
        sa.Column('mensaje', sa.Text(), nullable=False),
        sa.Column('email_contacto', sa.String(length=320), nullable=True),
        sa.Column('source_app', sa.String(length=50), nullable=False),
        sa.Column('source_route', sa.String(length=500), nullable=True),
        sa.Column(
            'source_context',
            sa.JSON(),
            nullable=False,
            server_default=sa.text("'{}'::json"),
        ),
        sa.Column(
            'screenshot_bucket_id',
            sa.Integer(),
            sa.ForeignKey('media_buckets.id'),
            nullable=True,
        ),
        sa.Column('screenshot_object_path', sa.String(length=500), nullable=True),
        sa.Column(
            'estado',
            reporte_estado,
            nullable=False,
            server_default='nuevo',
        ),
        sa.Column('nota_interna', sa.Text(), nullable=True),
        sa.Column(
            'atendido_por_id',
            sa.Integer(),
            sa.ForeignKey('usuarios.id'),
            nullable=True,
        ),
        sa.Column('creado_en', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('actualizado_en', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_reportes_source_app', 'reportes', ['source_app'])
    op.create_index('ix_reportes_estado', 'reportes', ['estado'])
    op.create_index('ix_reportes_creado_en', 'reportes', ['creado_en'])
    op.create_index('ix_reportes_screenshot_bucket_id', 'reportes', ['screenshot_bucket_id'])


def downgrade() -> None:
    op.drop_index('ix_reportes_screenshot_bucket_id', table_name='reportes')
    op.drop_index('ix_reportes_creado_en', table_name='reportes')
    op.drop_index('ix_reportes_estado', table_name='reportes')
    op.drop_index('ix_reportes_source_app', table_name='reportes')
    op.drop_table('reportes')
    op.execute("DROP TYPE IF EXISTS reporte_estado")
    op.execute("DROP TYPE IF EXISTS reporte_tipo")
