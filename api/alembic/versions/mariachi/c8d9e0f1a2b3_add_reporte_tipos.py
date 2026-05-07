"""add reporte_tipos table + seed + backfill

Revision ID: c8d9e0f1a2b3
Revises: b6c7d8e9f0a1
Create Date: 2026-05-07 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'c8d9e0f1a2b3'
down_revision = 'b6c7d8e9f0a1'
branch_labels = None
depends_on = None


SEEDS = [
    ('problema', 'Problema', 'red', 'warning', 'Algo no funciona como esperabas.', 1),
    ('solicitud', 'Solicitud', 'blue', 'inbox', 'Pides algo nuevo o un cambio formal.', 2),
    ('sugerencia', 'Sugerencia', 'green', 'bulb', 'Idea de mejora.', 3),
    ('duda', 'Duda', 'gold', 'question', 'No te queda claro algo.', 4),
    ('datos_incorrectos', 'Datos incorrectos', 'orange', 'flag', 'Un dato visible es erróneo o desactualizado.', 5),
    ('bug', 'Bug', 'purple', 'bug', 'Error técnico de la aplicación.', 6),
]


def upgrade() -> None:
    op.create_table(
        'reporte_tipos',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('slug', sa.String(length=50), nullable=False),
        sa.Column('label', sa.String(length=100), nullable=False),
        sa.Column('color', sa.String(length=20), nullable=False, server_default='default'),
        sa.Column('icon', sa.String(length=50), nullable=True),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('activo', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('orden', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('creado_en', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('actualizado_en', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_reporte_tipos_slug', 'reporte_tipos', ['slug'], unique=True)
    op.create_index('ix_reporte_tipos_activo', 'reporte_tipos', ['activo'])
    op.create_index('ix_reporte_tipos_orden', 'reporte_tipos', ['orden'])

    op.add_column(
        'reportes',
        sa.Column('tipo_id', sa.Integer(), nullable=True),
    )
    op.create_index('ix_reportes_tipo_id', 'reportes', ['tipo_id'])
    op.create_foreign_key(
        'fk_reportes_tipo_id_reporte_tipos',
        'reportes',
        'reporte_tipos',
        ['tipo_id'],
        ['id'],
    )

    bind = op.get_bind()
    for slug, label, color, icon, descripcion, orden in SEEDS:
        bind.execute(
            sa.text(
                "INSERT INTO reporte_tipos (slug, label, color, icon, descripcion, activo, orden) "
                "VALUES (:slug, :label, :color, :icon, :descripcion, true, :orden)"
            ),
            {
                'slug': slug,
                'label': label,
                'color': color,
                'icon': icon,
                'descripcion': descripcion,
                'orden': orden,
            },
        )

    bind.execute(
        sa.text(
            "UPDATE reportes "
            "SET tipo_id = rt.id "
            "FROM reporte_tipos rt "
            "WHERE rt.slug = reportes.tipo::text "
            "AND reportes.tipo_id IS NULL"
        )
    )


def downgrade() -> None:
    op.drop_constraint('fk_reportes_tipo_id_reporte_tipos', 'reportes', type_='foreignkey')
    op.drop_index('ix_reportes_tipo_id', table_name='reportes')
    op.drop_column('reportes', 'tipo_id')

    op.drop_index('ix_reporte_tipos_orden', table_name='reporte_tipos')
    op.drop_index('ix_reporte_tipos_activo', table_name='reporte_tipos')
    op.drop_index('ix_reporte_tipos_slug', table_name='reporte_tipos')
    op.drop_table('reporte_tipos')
