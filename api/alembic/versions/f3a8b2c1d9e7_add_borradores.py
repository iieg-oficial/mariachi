"""add_borradores

Revision ID: f3a8b2c1d9e7
Revises: 62523bba38ac
Create Date: 2026-02-18 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'f3a8b2c1d9e7'
down_revision = '62523bba38ac'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'borradores',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('resource_type', sa.String(), nullable=False),
        sa.Column('resource_id', sa.String(), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=False),
        sa.Column('data', sa.JSON(), nullable=False),
        sa.Column('creado_en', sa.DateTime(), nullable=True),
        sa.Column('actualizado_en', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('resource_type', 'resource_id', 'usuario_id', name='uq_borrador_recurso_usuario'),
    )
    op.create_index(op.f('ix_borradores_id'), 'borradores', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_borradores_id'), table_name='borradores')
    op.drop_table('borradores')
