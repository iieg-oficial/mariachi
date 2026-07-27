"""propuestas ciudadanas de tarjeta de informacion del catalogo de MapaLab

Bandeja de moderacion: quien usa el catalogo puede proponer que campos aparecen
en la tarjeta de una capa y en que orden. La propuesta llega aqui en estado
'pendiente' y no cambia nada de lo publico hasta que un revisor la aprueba; al
aprobarla se escribe en mapalab.catalogo_capas.infobox_config (dataengine) y se
invalida el cache del catalogo.

`config` guarda unicamente el JSON ya saneado por InfoboxPropuestaConfig
(allowlist de claves, esquemas de href y topes de tamaño), nunca lo que llego
del cliente. `email` es opcional: sirve para avisar el resultado y su ausencia
deja la propuesta anonima. `ip_hash` permite detectar abuso sin guardar la IP.

Revision ID: d4e5f6a7b8ca
Revises: c3d4e5f6a7b9
Create Date: 2026-07-27
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = 'd4e5f6a7b8ca'
down_revision = 'c3d4e5f6a7b9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'mapalab_infobox_propuestas',
        sa.Column('id', sa.BigInteger, primary_key=True),
        sa.Column('capa_slug', sa.String(length=100), nullable=False),
        sa.Column('config', postgresql.JSONB, nullable=False),
        sa.Column('comentario', sa.Text, nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('estado', sa.String(length=20), nullable=False, server_default='pendiente'),
        sa.Column('comentario_revision', sa.Text, nullable=True),
        sa.Column('revisado_por', sa.String(length=255), nullable=True),
        sa.Column('revisado_en', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ip_hash', sa.String(length=64), nullable=True),
        sa.Column('creado_en', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.CheckConstraint(
            "estado IN ('pendiente', 'aprobada', 'rechazada')",
            name='ck_infobox_propuestas_estado',
        ),
    )
    op.create_index(
        'ix_infobox_propuestas_pendientes',
        'mapalab_infobox_propuestas',
        ['capa_slug'],
        postgresql_where=sa.text("estado = 'pendiente'"),
    )
    op.create_index(
        'ix_infobox_propuestas_creado',
        'mapalab_infobox_propuestas',
        [sa.text('creado_en DESC')],
    )


def downgrade() -> None:
    op.drop_index('ix_infobox_propuestas_creado', table_name='mapalab_infobox_propuestas')
    op.drop_index('ix_infobox_propuestas_pendientes', table_name='mapalab_infobox_propuestas')
    op.drop_table('mapalab_infobox_propuestas')
