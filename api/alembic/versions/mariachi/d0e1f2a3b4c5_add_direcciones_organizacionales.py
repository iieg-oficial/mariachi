"""add direcciones_organizacionales + direccion_id en reportes

Revision ID: d0e1f2a3b4c5
Revises: c8d9e0f1a2b3
Create Date: 2026-05-07 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'd0e1f2a3b4c5'
down_revision = 'c8d9e0f1a2b3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'direcciones_organizacionales',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('nombre', sa.String(length=200), nullable=False),
        sa.Column('siglas', sa.String(length=20), nullable=True),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('email_contacto', sa.String(length=320), nullable=True),
        sa.Column('responsable_nombre', sa.String(length=200), nullable=True),
        sa.Column('activo', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('orden', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('creado_en', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('actualizado_en', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_direcciones_organizacionales_siglas', 'direcciones_organizacionales', ['siglas'])
    op.create_index('ix_direcciones_organizacionales_activo', 'direcciones_organizacionales', ['activo'])
    op.create_index('ix_direcciones_organizacionales_orden', 'direcciones_organizacionales', ['orden'])

    op.add_column(
        'reportes',
        sa.Column('direccion_id', sa.Integer(), nullable=True),
    )
    op.create_index('ix_reportes_direccion_id', 'reportes', ['direccion_id'])
    op.create_foreign_key(
        'fk_reportes_direccion_id_direcciones',
        'reportes',
        'direcciones_organizacionales',
        ['direccion_id'],
        ['id'],
    )


def downgrade() -> None:
    op.drop_constraint('fk_reportes_direccion_id_direcciones', 'reportes', type_='foreignkey')
    op.drop_index('ix_reportes_direccion_id', table_name='reportes')
    op.drop_column('reportes', 'direccion_id')

    op.drop_index('ix_direcciones_organizacionales_orden', table_name='direcciones_organizacionales')
    op.drop_index('ix_direcciones_organizacionales_activo', table_name='direcciones_organizacionales')
    op.drop_index('ix_direcciones_organizacionales_siglas', table_name='direcciones_organizacionales')
    op.drop_table('direcciones_organizacionales')
