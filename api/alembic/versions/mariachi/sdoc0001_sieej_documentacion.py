"""sieej_documentacion: documentación de pipelines editable y sincronizada

Revision ID: sdoc0001
Revises: m3lnt0001
Create Date: 2026-10-02

"""

import sqlalchemy as sa

from alembic import op

revision = "sdoc0001"
down_revision = "m3lnt0001"
branch_labels = None
depends_on = None

SCHEMA = "sieej_documentacion"


def upgrade() -> None:
    op.execute(f"CREATE SCHEMA IF NOT EXISTS {SCHEMA}")
    op.create_table(
        "pipelines",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("clave", sa.String(80), nullable=False),
        sa.Column("carpeta_etl", sa.String(120), nullable=True),
        sa.Column("estado", sa.String(20), nullable=False, server_default="nuevo"),
        sa.Column("fuentes_detectadas", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("orden", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("visible", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("contenido_borrador", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("contenido_publicado", sa.JSON(), nullable=True),
        sa.Column("detectado_en", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("publicado_en", sa.DateTime(), nullable=True),
        sa.Column("actualizado_en", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("actualizado_por", sa.String(120), nullable=True),
        sa.UniqueConstraint("clave", name="uq_sieej_documentacion_pipelines_clave"),
        schema=SCHEMA,
    )
    op.create_table(
        "mediciones",
        sa.Column(
            "pipeline_id",
            sa.Integer(),
            sa.ForeignKey(f"{SCHEMA}.pipelines.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("clasificacion", sa.String(40), nullable=True),
        sa.Column("base", sa.JSON(), nullable=True),
        sa.Column("origen_base", sa.String(20), nullable=True),
        sa.Column("corte_respaldo", sa.String(60), nullable=True),
        sa.Column("etapas", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("der_svg", sa.Text(), nullable=True),
        sa.Column("sincronizado_en", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        schema=SCHEMA,
    )
    op.create_table(
        "readmes",
        sa.Column(
            "pipeline_id",
            sa.Integer(),
            sa.ForeignKey(f"{SCHEMA}.pipelines.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("contenido", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("commit", sa.String(40), nullable=True),
        sa.Column("sincronizado_en", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        schema=SCHEMA,
    )
    op.create_table(
        "sincronizaciones",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("iniciado_en", sa.DateTime(), nullable=False),
        sa.Column("terminado_en", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("duracion_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("estado", sa.String(20), nullable=False),
        sa.Column("fuentes", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("nuevos", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("actualizados", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("errores", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("version", sa.String(40), nullable=True),
        schema=SCHEMA,
    )
    op.create_index(
        "ix_sieej_documentacion_sincronizaciones_terminado",
        "sincronizaciones",
        ["terminado_en"],
        schema=SCHEMA,
    )


def downgrade() -> None:
    op.drop_table("sincronizaciones", schema=SCHEMA)
    op.drop_table("readmes", schema=SCHEMA)
    op.drop_table("mediciones", schema=SCHEMA)
    op.drop_table("pipelines", schema=SCHEMA)
    op.execute(f"DROP SCHEMA IF EXISTS {SCHEMA}")
