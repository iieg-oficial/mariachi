"""vine: schema propio, personas y eventos de acceso

Revision ID: v1ne0001
Revises: merge0001
Create Date: 2026-08-12

"""
from alembic import op
import sqlalchemy as sa


revision = 'v1ne0001'
down_revision = 'merge0001'
branch_labels = None
depends_on = None

SCHEMA = 'vine'


def upgrade() -> None:
    op.execute(f'CREATE SCHEMA IF NOT EXISTS {SCHEMA}')

    op.create_table(
        'personas',
        sa.Column('pin', sa.String(length=30), nullable=False),
        sa.Column('nombre', sa.String(length=150), nullable=False),
        sa.Column('apellidos', sa.String(length=150), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('departamento', sa.String(length=150), nullable=True),
        sa.Column('puesto', sa.String(length=150), nullable=True),
        sa.Column('sincronizado_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('pin'),
        schema=SCHEMA,
    )

    op.create_table(
        'eventos',
        sa.Column('id', sa.Integer(), autoincrement=False, nullable=False),
        sa.Column('pin', sa.String(length=30), nullable=False),
        sa.Column('event_time', sa.DateTime(), nullable=False),
        sa.Column('direccion', sa.String(length=8), nullable=True),
        sa.Column('punto', sa.String(length=100), nullable=True),
        sa.Column('lector', sa.String(length=100), nullable=True),
        sa.Column('evento', sa.String(length=120), nullable=True),
        sa.Column('verificacion', sa.String(length=60), nullable=True),
        sa.Column('dispositivo', sa.String(length=100), nullable=True),
        sa.Column('sincronizado_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        schema=SCHEMA,
    )
    op.create_index('ix_vine_eventos_pin', 'eventos', ['pin'], schema=SCHEMA)
    op.create_index('ix_vine_eventos_event_time', 'eventos', ['event_time'], schema=SCHEMA)
    op.create_index('ix_vine_eventos_direccion', 'eventos', ['direccion'], schema=SCHEMA)
    op.create_index('ix_vine_eventos_pin_time', 'eventos', ['pin', 'event_time'], schema=SCHEMA)


def downgrade() -> None:
    op.drop_index('ix_vine_eventos_pin_time', table_name='eventos', schema=SCHEMA)
    op.drop_index('ix_vine_eventos_direccion', table_name='eventos', schema=SCHEMA)
    op.drop_index('ix_vine_eventos_event_time', table_name='eventos', schema=SCHEMA)
    op.drop_index('ix_vine_eventos_pin', table_name='eventos', schema=SCHEMA)
    op.drop_table('eventos', schema=SCHEMA)
    op.drop_table('personas', schema=SCHEMA)
