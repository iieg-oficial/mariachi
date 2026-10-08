"""telemetría del embebido: rendimiento y sitios por día, denegaciones sin llave

Revision ID: mktl0001
Revises: sdoc0001
Create Date: 2026-10-05

"""

import sqlalchemy as sa

from alembic import op

revision = "mktl0001"
down_revision = "sdoc0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "mapalab_api_keys_rendimiento_diario",
        sa.Column("api_key_id", sa.Integer(), nullable=False),
        sa.Column("dia", sa.Date(), nullable=False),
        sa.Column("origen", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("metrica", sa.String(length=20), nullable=False),
        sa.Column("muestras", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("suma", sa.Float(), nullable=False, server_default="0"),
        sa.Column("buenas", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("regulares", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("malas", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(
            ["api_key_id"],
            ["mapalab_api_keys.id"],
            name="fk_mapalab_api_keys_rendimiento_diario_key",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint(
            "api_key_id",
            "dia",
            "origen",
            "metrica",
            name="pk_mapalab_api_keys_rendimiento_diario",
        ),
    )
    op.create_table(
        "mapalab_api_keys_sitios_diario",
        sa.Column("api_key_id", sa.Integer(), nullable=False),
        sa.Column("dia", sa.Date(), nullable=False),
        sa.Column("origen", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("cargas", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("listos", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("errores_js", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("denegados", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("timeouts", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(
            ["api_key_id"],
            ["mapalab_api_keys.id"],
            name="fk_mapalab_api_keys_sitios_diario_key",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("api_key_id", "dia", "origen", name="pk_mapalab_api_keys_sitios_diario"),
    )
    op.alter_column("mapalab_api_keys_accesos", "api_key_id", existing_type=sa.Integer(), nullable=True)
    op.add_column("mapalab_api_keys_accesos", sa.Column("key_prefix", sa.String(length=20), nullable=True))
    op.create_index("ix_mapalab_api_keys_accesos_key_prefix", "mapalab_api_keys_accesos", ["key_prefix"])


def downgrade() -> None:
    op.drop_index("ix_mapalab_api_keys_accesos_key_prefix", table_name="mapalab_api_keys_accesos")
    op.drop_column("mapalab_api_keys_accesos", "key_prefix")
    op.execute("DELETE FROM mapalab_api_keys_accesos WHERE api_key_id IS NULL")
    op.alter_column("mapalab_api_keys_accesos", "api_key_id", existing_type=sa.Integer(), nullable=False)
    op.drop_table("mapalab_api_keys_sitios_diario")
    op.drop_table("mapalab_api_keys_rendimiento_diario")
