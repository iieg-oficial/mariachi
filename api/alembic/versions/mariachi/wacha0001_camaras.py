"""wacha: schema propio y catalogo de camaras

Revision ID: wacha0001
Revises: 1dent1dad0003
Create Date: 2026-08-10 18:10:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'wacha0001'
down_revision = '1dent1dad0003'
branch_labels = None
depends_on = None

SCHEMA = 'wacha'


def upgrade() -> None:
    op.execute(f'CREATE SCHEMA IF NOT EXISTS {SCHEMA}')

    op.create_table(
        'camaras',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=20), nullable=False),
        sa.Column('etiqueta', sa.String(length=200), nullable=False),
        sa.Column('ubicacion', sa.Text(), nullable=True),
        sa.Column('rtsp_url', sa.Text(), nullable=False),
        sa.Column('habilitada', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('grabacion_habilitada', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('retencion_dias', sa.Integer(), server_default='7', nullable=False),
        sa.Column('deteccion_habilitada', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('orden', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        schema=SCHEMA,
    )
    op.create_index('ix_wacha_camaras_nombre', 'camaras', ['nombre'], unique=True, schema=SCHEMA)


def downgrade() -> None:
    op.drop_index('ix_wacha_camaras_nombre', table_name='camaras', schema=SCHEMA)
    op.drop_table('camaras', schema=SCHEMA)
    op.execute(f'DROP SCHEMA IF EXISTS {SCHEMA}')
