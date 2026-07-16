"""add_formulario_version_sieej

Revision ID: b3c4d5e6f7a8
Revises: a0b1c2d3e4f5
Create Date: 2026-07-16 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = 'b3c4d5e6f7a8'
down_revision = 'a0b1c2d3e4f5'
branch_labels = None
depends_on = None

SCHEMA = "sieej"


def upgrade() -> None:
    op.create_table(
        "formulario_version",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "formulario_id",
            sa.Integer(),
            sa.ForeignKey(f"{SCHEMA}.formulario.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("definicion", postgresql.JSONB(), nullable=False),
        sa.Column(
            "archivado_en",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "actor_usuario_id",
            sa.Integer(),
            sa.ForeignKey("usuarios.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.UniqueConstraint(
            "formulario_id", "version", name="uq_formulario_version"
        ),
        schema=SCHEMA,
    )
    op.create_index(
        "ix_sieej_formulario_version_formulario_id",
        "formulario_version",
        ["formulario_id"],
        schema=SCHEMA,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_sieej_formulario_version_formulario_id",
        table_name="formulario_version",
        schema=SCHEMA,
    )
    op.drop_table("formulario_version", schema=SCHEMA)
