"""add source_apps + reportes.source_app_id + backfill

Revision ID: e1f2a3b4c5d6
Revises: d0e1f2a3b4c5
Create Date: 2026-05-07 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = 'e1f2a3b4c5d6'
down_revision = 'd0e1f2a3b4c5'
branch_labels = None
depends_on = None


SEEDS = [
    ('mapalab', 'MapaLab', 'Visor de mapas del IIEG.'),
    ('sieej', 'SIEEJ', 'Sistema de Información Estadística del Estado de Jalisco.'),
    ('portal', 'Portal IIEG', 'Sitio público del IIEG.'),
]


def upgrade() -> None:
    op.create_table(
        'source_apps',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('slug', sa.String(length=50), nullable=False),
        sa.Column('nombre', sa.String(length=150), nullable=False),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('api_key_hash', sa.String(length=255), nullable=True),
        sa.Column('api_key_prefix', sa.String(length=20), nullable=True),
        sa.Column(
            'dominios_permitidos',
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            'tipos_permitidos',
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column('rate_limit_per_hour', sa.Integer(), nullable=False, server_default='60'),
        sa.Column(
            'branding',
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column('notificar_discord', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('discord_webhook_url', sa.String(length=500), nullable=True),
        sa.Column('activo', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('creado_en', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('actualizado_en', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_source_apps_slug', 'source_apps', ['slug'], unique=True)
    op.create_index('ix_source_apps_api_key_prefix', 'source_apps', ['api_key_prefix'])
    op.create_index('ix_source_apps_activo', 'source_apps', ['activo'])

    op.add_column(
        'reportes',
        sa.Column('source_app_id', sa.Integer(), nullable=True),
    )
    op.create_index('ix_reportes_source_app_id', 'reportes', ['source_app_id'])
    op.create_foreign_key(
        'fk_reportes_source_app_id_source_apps',
        'reportes',
        'source_apps',
        ['source_app_id'],
        ['id'],
    )

    bind = op.get_bind()
    for slug, nombre, descripcion in SEEDS:
        bind.execute(
            sa.text(
                "INSERT INTO source_apps (slug, nombre, descripcion, dominios_permitidos, "
                "rate_limit_per_hour, notificar_discord, activo) "
                "VALUES (:slug, :nombre, :descripcion, '[]'::jsonb, 60, true, false)"
            ),
            {'slug': slug, 'nombre': nombre, 'descripcion': descripcion},
        )

    bind.execute(
        sa.text(
            "UPDATE reportes "
            "SET source_app_id = sa.id "
            "FROM source_apps sa "
            "WHERE sa.slug = reportes.source_app "
            "AND reportes.source_app_id IS NULL"
        )
    )


def downgrade() -> None:
    op.drop_constraint('fk_reportes_source_app_id_source_apps', 'reportes', type_='foreignkey')
    op.drop_index('ix_reportes_source_app_id', table_name='reportes')
    op.drop_column('reportes', 'source_app_id')

    op.drop_index('ix_source_apps_activo', table_name='source_apps')
    op.drop_index('ix_source_apps_api_key_prefix', table_name='source_apps')
    op.drop_index('ix_source_apps_slug', table_name='source_apps')
    op.drop_table('source_apps')
