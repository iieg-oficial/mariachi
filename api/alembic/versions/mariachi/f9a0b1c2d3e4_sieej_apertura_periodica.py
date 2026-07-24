"""sieej: apertura periodica de formularios + bitacora de avisos

Revision ID: f9a0b1c2d3e4
Revises: e2b3c4d5f6a7, f2b3c4d5e6a7
Create Date: 2026-07-23 13:30:00.000000

Soporte de apertura periodica de formularios SIEEJ. Ademas de agregar el
esquema, esta revision UNE los dos heads que existian (envio_valor_historial y
reportes_tipo_enum_to_string) para dejar una sola cabeza.

Cambios:
  - formulario.periodicidad (JSONB): config de recurrencia (frecuencia,
    dia_inicio, duracion_dias, ancla). NULL = formulario no periodico.
  - sieej.formulario_periodo: ventanas materializadas por periodo.
  - sieej.notificacion: bitacora de avisos (apertura / faltantes).
  - envio_formulario.periodo_id: liga el envio al periodo capturado.
  - Se reemplaza el UNIQUE(formulario_id, usuario_id) por dos indices unicos
    parciales: uno por (formulario, usuario, periodo) para formularios
    periodicos y otro por (formulario, usuario) para los no periodicos, sin
    romper el legado.
"""
import sqlalchemy as sa
from alembic import op


revision = "f9a0b1c2d3e4"
down_revision = ("e2b3c4d5f6a7", "f2b3c4d5e6a7")
branch_labels = None
depends_on = None

SCHEMA = "sieej"


def upgrade() -> None:
    periodo_estado = sa.Enum(
        "programado",
        "abierto",
        "cerrado",
        name="sieej_periodo_estado",
        schema=SCHEMA,
    )
    notificacion_tipo = sa.Enum(
        "apertura",
        "faltantes",
        name="sieej_notificacion_tipo",
        schema=SCHEMA,
    )

    op.add_column(
        "formulario",
        sa.Column("periodicidad", sa.JSON(), nullable=True),
        schema=SCHEMA,
    )

    op.create_table(
        "formulario_periodo",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("formulario_id", sa.Integer(), nullable=False),
        sa.Column("clave", sa.String(length=32), nullable=False),
        sa.Column("apertura", sa.DateTime(timezone=True), nullable=False),
        sa.Column("cierre", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "estado", periodo_estado, nullable=False, server_default="programado"
        ),
        sa.Column("notificado_apertura_en", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notificado_faltantes_en", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "creado_en",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["formulario_id"], [f"{SCHEMA}.formulario.id"], ondelete="CASCADE"
        ),
        sa.UniqueConstraint(
            "formulario_id", "clave", name="uq_formulario_periodo_clave"
        ),
        schema=SCHEMA,
    )
    op.create_index(
        "ix_formulario_periodo_formulario_id",
        "formulario_periodo",
        ["formulario_id"],
        schema=SCHEMA,
    )
    op.create_index(
        "ix_formulario_periodo_estado",
        "formulario_periodo",
        ["estado"],
        schema=SCHEMA,
    )

    op.create_table(
        "notificacion",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("formulario_id", sa.Integer(), nullable=False),
        sa.Column("periodo_id", sa.Integer(), nullable=True),
        sa.Column("tipo", notificacion_tipo, nullable=False),
        sa.Column("resumen", sa.Text(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.Column("destinatarios", sa.JSON(), nullable=True),
        sa.Column(
            "enviado_en",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(
            ["formulario_id"], [f"{SCHEMA}.formulario.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["periodo_id"],
            [f"{SCHEMA}.formulario_periodo.id"],
            ondelete="SET NULL",
        ),
        schema=SCHEMA,
    )
    op.create_index(
        "ix_notificacion_formulario_id",
        "notificacion",
        ["formulario_id"],
        schema=SCHEMA,
    )

    op.add_column(
        "envio_formulario",
        sa.Column("periodo_id", sa.Integer(), nullable=True),
        schema=SCHEMA,
    )
    op.create_foreign_key(
        "fk_envio_formulario_periodo",
        "envio_formulario",
        "formulario_periodo",
        ["periodo_id"],
        ["id"],
        source_schema=SCHEMA,
        referent_schema=SCHEMA,
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_envio_formulario_periodo_id",
        "envio_formulario",
        ["periodo_id"],
        schema=SCHEMA,
    )

    # Reemplazar el UNIQUE global por dos indices unicos parciales.
    op.drop_constraint(
        "uq_envio_formulario_user",
        "envio_formulario",
        schema=SCHEMA,
        type_="unique",
    )
    op.create_index(
        "uq_envio_formulario_periodo",
        "envio_formulario",
        ["formulario_id", "usuario_id", "periodo_id"],
        unique=True,
        schema=SCHEMA,
        postgresql_where=sa.text("periodo_id IS NOT NULL"),
    )
    op.create_index(
        "uq_envio_formulario_user",
        "envio_formulario",
        ["formulario_id", "usuario_id"],
        unique=True,
        schema=SCHEMA,
        postgresql_where=sa.text("periodo_id IS NULL"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_envio_formulario_user", table_name="envio_formulario", schema=SCHEMA
    )
    op.drop_index(
        "uq_envio_formulario_periodo",
        table_name="envio_formulario",
        schema=SCHEMA,
    )
    op.create_unique_constraint(
        "uq_envio_formulario_user",
        "envio_formulario",
        ["formulario_id", "usuario_id"],
        schema=SCHEMA,
    )
    op.drop_index(
        "ix_envio_formulario_periodo_id",
        table_name="envio_formulario",
        schema=SCHEMA,
    )
    op.drop_constraint(
        "fk_envio_formulario_periodo",
        "envio_formulario",
        schema=SCHEMA,
        type_="foreignkey",
    )
    op.drop_column("envio_formulario", "periodo_id", schema=SCHEMA)

    op.drop_index(
        "ix_notificacion_formulario_id", table_name="notificacion", schema=SCHEMA
    )
    op.drop_table("notificacion", schema=SCHEMA)

    op.drop_index(
        "ix_formulario_periodo_estado",
        table_name="formulario_periodo",
        schema=SCHEMA,
    )
    op.drop_index(
        "ix_formulario_periodo_formulario_id",
        table_name="formulario_periodo",
        schema=SCHEMA,
    )
    op.drop_table("formulario_periodo", schema=SCHEMA)

    op.drop_column("formulario", "periodicidad", schema=SCHEMA)

    sa.Enum(name="sieej_notificacion_tipo", schema=SCHEMA).drop(
        op.get_bind(), checkfirst=True
    )
    sa.Enum(name="sieej_periodo_estado", schema=SCHEMA).drop(
        op.get_bind(), checkfirst=True
    )
