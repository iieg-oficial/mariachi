"""add eventos and home_sections

Revision ID: a7b8c9d0e1f2
Revises: f1a2b3c4d5e6
Create Date: 2026-04-26 12:00:00.000000

"""
import json

import sqlalchemy as sa
from alembic import op


revision = 'a7b8c9d0e1f2'
down_revision = 'f1a2b3c4d5e6'
branch_labels = None
depends_on = None


HOME_SECTION_DEFAULTS = {
    'banner': {
        'titulo': '',
        'descripcion': '',
        'imagen_url': '',
        'cta_label': '',
        'cta_href': '',
        'activo': False,
    },
    'topics': {'items': []},
    'guide': {'items': []},
    'select': {'items': []},
    'faq': {'items': []},
    'video': {
        'youtube_id': '',
        'titulo': '',
        'descripcion': '',
        'activo': False,
    },
    'footer': {'links': []},
}


def upgrade() -> None:
    op.create_table(
        'eventos',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('slug', sa.String(length=120), nullable=False),
        sa.Column('titulo', sa.String(length=200), nullable=False),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('icono_url', sa.Text(), nullable=True),
        sa.Column('bbox', sa.JSON(), nullable=True),
        sa.Column('capas', sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")),
        sa.Column('activo', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('fecha_inicio', sa.DateTime(), nullable=True),
        sa.Column('fecha_fin', sa.DateTime(), nullable=True),
        sa.Column('orden', sa.Integer(), nullable=False, server_default='0'),
        sa.Column(
            'estado',
            sa.Enum('draft', 'published', name='evento_estado'),
            nullable=False,
            server_default='draft',
        ),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('published_at', sa.DateTime(), nullable=True),
        sa.UniqueConstraint('slug', name='uq_eventos_slug'),
    )
    op.create_index('ix_eventos_slug', 'eventos', ['slug'], unique=True)
    op.create_index('ix_eventos_estado_activo', 'eventos', ['estado', 'activo'], unique=False)

    op.create_table(
        'home_sections',
        sa.Column('key', sa.String(length=40), primary_key=True),
        sa.Column('payload_published', sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column('payload_draft', sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('published_at', sa.DateTime(), nullable=True),
    )

    conn = op.get_bind()
    for key, payload in HOME_SECTION_DEFAULTS.items():
        conn.execute(
            sa.text(
                "INSERT INTO home_sections (key, payload_published, payload_draft, updated_at) "
                "VALUES (:key, CAST(:p AS JSON), CAST(:p AS JSON), NOW())"
            ),
            {'key': key, 'p': json.dumps(payload)},
        )


def downgrade() -> None:
    op.drop_table('home_sections')
    op.drop_index('ix_eventos_estado_activo', table_name='eventos')
    op.drop_index('ix_eventos_slug', table_name='eventos')
    op.drop_table('eventos')
    op.execute('DROP TYPE IF EXISTS evento_estado')
