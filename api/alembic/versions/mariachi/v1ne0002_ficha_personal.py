"""ficha editable del personal de vine

Revision ID: v1ne0002
Revises: v1ne0001
"""
from alembic import op
import sqlalchemy as sa

revision = "v1ne0002"
down_revision = "v1ne0001"
branch_labels = None
depends_on = None

SCHEMA = "vine"


def upgrade() -> None:
    op.create_table(
        "personas_ficha",
        sa.Column("pin", sa.String(30), primary_key=True),
        sa.Column("nombre", sa.String(150)),
        sa.Column("apellidos", sa.String(150)),
        sa.Column("email", sa.String(255)),
        sa.Column("telefono", sa.String(50)),
        sa.Column("departamento", sa.String(150)),
        sa.Column("vinculo", sa.String(80)),
        sa.Column("puesto", sa.String(150)),
        sa.Column("horario", sa.String(10)),
        sa.Column("cumpleanos", sa.Date()),
        sa.Column("fecha_ingreso", sa.Date()),
        sa.Column("foto_url", sa.Text()),
        sa.Column("activo", sa.Boolean()),
        sa.Column("notas", sa.Text()),
        sa.Column(
            "actualizado_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("(now() AT TIME ZONE 'utc')"),
        ),
        sa.Column("actualizado_por", sa.String(150)),
        sa.ForeignKeyConstraint(["pin"], [f"{SCHEMA}.personas.pin"], ondelete="CASCADE"),
        schema=SCHEMA,
    )


def downgrade() -> None:
    op.drop_table("personas_ficha", schema=SCHEMA)
