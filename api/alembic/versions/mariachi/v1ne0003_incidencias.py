"""incidencias del personal de vine

Revision ID: v1ne0003
Revises: v1ne0002
"""
from alembic import op
import sqlalchemy as sa

revision = "v1ne0003"
down_revision = "v1ne0002"
branch_labels = None
depends_on = None

SCHEMA = "vine"


def upgrade() -> None:
    op.create_table(
        "incidencias",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("pin", sa.String(30), nullable=False),
        sa.Column("desde", sa.Date(), nullable=False),
        sa.Column("hasta", sa.Date(), nullable=False),
        sa.Column("tipo", sa.String(30), nullable=False),
        sa.Column("nota", sa.Text()),
        sa.Column(
            "creado_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("(now() AT TIME ZONE 'utc')"),
        ),
        sa.Column("creado_por", sa.String(150)),
        sa.CheckConstraint("hasta >= desde", name="ck_vine_incidencias_rango"),
        sa.ForeignKeyConstraint(["pin"], [f"{SCHEMA}.personas.pin"], ondelete="CASCADE"),
        schema=SCHEMA,
    )
    op.create_index(
        "ix_vine_incidencias_pin_desde", "incidencias", ["pin", "desde"], schema=SCHEMA
    )


def downgrade() -> None:
    op.drop_index("ix_vine_incidencias_pin_desde", table_name="incidencias", schema=SCHEMA)
    op.drop_table("incidencias", schema=SCHEMA)
