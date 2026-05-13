"""add mapalab_api_keys + eventos + uso_diario

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c0
Create Date: 2026-05-08 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = 'e5f6a7b8c9d0'
down_revision = 'd4e5f6a7b8c0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'mapalab_api_keys',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('institucion_nombre', sa.String(length=150), nullable=False),
        sa.Column('institucion_email_contacto', sa.String(length=255), nullable=True),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('visibility', sa.String(length=20), nullable=False, server_default='public'),
        sa.Column('key_prefix', sa.String(length=20), nullable=False),
        sa.Column('key_hash', sa.String(length=255), nullable=False),
        sa.Column(
            'dominios_permitidos',
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            'ips_permitidas',
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            'capas_permitidas',
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column('cuota_diaria', sa.Integer(), nullable=True),
        sa.Column('cuota_mensual', sa.Integer(), nullable=True),
        sa.Column('estado', sa.String(length=20), nullable=False, server_default='active'),
        sa.Column('expira_en', sa.DateTime(), nullable=True),
        sa.Column('notas_admin', sa.Text(), nullable=True),
        sa.Column('creado_por_user_id', sa.Integer(), nullable=True),
        sa.Column('creado_en', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('actualizado_en', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('usado_en', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ['creado_por_user_id'],
            ['usuarios.id'],
            name='fk_mapalab_api_keys_creado_por',
            ondelete='SET NULL',
        ),
    )
    op.create_index('ix_mapalab_api_keys_key_prefix', 'mapalab_api_keys', ['key_prefix'], unique=True)
    op.create_index('ix_mapalab_api_keys_visibility', 'mapalab_api_keys', ['visibility'])
    op.create_index('ix_mapalab_api_keys_estado', 'mapalab_api_keys', ['estado'])
    op.create_index('ix_mapalab_api_keys_expira_en', 'mapalab_api_keys', ['expira_en'])

    op.create_table(
        'mapalab_api_keys_eventos',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('api_key_id', sa.Integer(), nullable=False),
        sa.Column('evento', sa.String(length=30), nullable=False),
        sa.Column('actor_user_id', sa.Integer(), nullable=True),
        sa.Column('payload', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('creado_en', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(
            ['api_key_id'],
            ['mapalab_api_keys.id'],
            name='fk_mapalab_api_keys_eventos_api_key',
            ondelete='CASCADE',
        ),
        sa.ForeignKeyConstraint(
            ['actor_user_id'],
            ['usuarios.id'],
            name='fk_mapalab_api_keys_eventos_actor',
            ondelete='SET NULL',
        ),
    )
    op.create_index('ix_mapalab_api_keys_eventos_api_key_id', 'mapalab_api_keys_eventos', ['api_key_id'])
    op.create_index('ix_mapalab_api_keys_eventos_evento', 'mapalab_api_keys_eventos', ['evento'])
    op.create_index('ix_mapalab_api_keys_eventos_creado_en', 'mapalab_api_keys_eventos', ['creado_en'])

    op.create_table(
        'mapalab_api_keys_uso_diario',
        sa.Column('api_key_id', sa.Integer(), nullable=False),
        sa.Column('dia', sa.Date(), nullable=False),
        sa.Column('requests', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('errores', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('bytes_out', sa.Integer(), nullable=False, server_default='0'),
        sa.PrimaryKeyConstraint('api_key_id', 'dia', name='pk_mapalab_api_keys_uso_diario'),
        sa.ForeignKeyConstraint(
            ['api_key_id'],
            ['mapalab_api_keys.id'],
            name='fk_mapalab_api_keys_uso_diario_api_key',
            ondelete='CASCADE',
        ),
    )


def downgrade() -> None:
    op.drop_table('mapalab_api_keys_uso_diario')

    op.drop_index('ix_mapalab_api_keys_eventos_creado_en', table_name='mapalab_api_keys_eventos')
    op.drop_index('ix_mapalab_api_keys_eventos_evento', table_name='mapalab_api_keys_eventos')
    op.drop_index('ix_mapalab_api_keys_eventos_api_key_id', table_name='mapalab_api_keys_eventos')
    op.drop_table('mapalab_api_keys_eventos')

    op.drop_index('ix_mapalab_api_keys_expira_en', table_name='mapalab_api_keys')
    op.drop_index('ix_mapalab_api_keys_estado', table_name='mapalab_api_keys')
    op.drop_index('ix_mapalab_api_keys_visibility', table_name='mapalab_api_keys')
    op.drop_index('ix_mapalab_api_keys_key_prefix', table_name='mapalab_api_keys')
    op.drop_table('mapalab_api_keys')
