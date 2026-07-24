"""add_envio_valor_historial_sieej

Revision ID: f2b3c4d5e6a7
Revises: e1a2b3c4d5f6
Create Date: 2026-07-23 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = 'f2b3c4d5e6a7'
down_revision = 'e1a2b3c4d5f6'
branch_labels = None
depends_on = None

SCHEMA = "sieej"


def upgrade() -> None:
    op.create_table(
        "envio_valor_historial",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "envio_id",
            sa.Integer(),
            sa.ForeignKey(f"{SCHEMA}.envio_formulario.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("field_path", sa.String(length=512), nullable=False),
        sa.Column("field_label", sa.String(length=512), nullable=True),
        sa.Column("valor_anterior", postgresql.JSONB(), nullable=True),
        sa.Column("valor_nuevo", postgresql.JSONB(), nullable=True),
        sa.Column("formulario_version", sa.Integer(), nullable=False),
        sa.Column(
            "actor_usuario_id",
            sa.Integer(),
            sa.ForeignKey("usuarios.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "cambiado_en",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        schema=SCHEMA,
    )
    op.create_index(
        "ix_sieej_envio_valor_historial_envio_id",
        "envio_valor_historial",
        ["envio_id"],
        schema=SCHEMA,
    )
    op.create_index(
        "ix_sieej_envio_valor_historial_cambiado_en",
        "envio_valor_historial",
        ["cambiado_en"],
        schema=SCHEMA,
    )
    with op.get_context().autocommit_block():
        op.execute(
            "ALTER TYPE sieej.sieej_evento_tipo "
            "ADD VALUE IF NOT EXISTS 'actualizado'"
        )


def downgrade() -> None:
    op.drop_index(
        "ix_sieej_envio_valor_historial_cambiado_en",
        table_name="envio_valor_historial",
        schema=SCHEMA,
    )
    op.drop_index(
        "ix_sieej_envio_valor_historial_envio_id",
        table_name="envio_valor_historial",
        schema=SCHEMA,
    )
    op.drop_table("envio_valor_historial", schema=SCHEMA)
    # Postgres no permite eliminar un valor de un enum sin recrear el tipo;
    # se conserva 'actualizado' en sieej.sieej_evento_tipo.
