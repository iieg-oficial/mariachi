"""add sieej formularios dinamicos schema

Revision ID: a4b5c6d7e8f9
Revises: d3e4f5a6b7c8
Create Date: 2026-05-06 12:00:00.000000

Plataforma de formularios dinamicos: agrega 8 tablas en el schema sieej
para soportar formularios definidos en JSONB, asignacion por grupos y
envios versionados con archivos en Acervo.

Tablas:
  - formulario               definicion JSONB + estado + vigencia
  - grupo                    grupos de respondents
  - usuario_grupo            membership N:M
  - formulario_grupo         asignacion por grupo
  - formulario_usuario       asignacion individual
  - envio_formulario         estado por usuario+formulario, datos JSONB
  - envio_archivo            archivos asociados a un campo del envio
  - envio_evento             auditoria append-only del ciclo de vida
"""
import sqlalchemy as sa
from alembic import op


revision = 'a4b5c6d7e8f9'
down_revision = 'd3e4f5a6b7c8'
branch_labels = None
depends_on = None


SCHEMA = "sieej"


def upgrade() -> None:
    # Cada enum se referencia desde una sola tabla; SQLAlchemy lo crea al
    # construir la columna. Con `create_type=False` evitamos el doble
    # CREATE TYPE cuando el codigo de columna lo materializa.
    formulario_estado = sa.Enum(
        'borrador', 'activo', 'cerrado',
        name='sieej_formulario_estado',
        schema=SCHEMA,
    )
    envio_estado = sa.Enum(
        'en_proceso', 'enviado', 'expirado',
        name='sieej_envio_estado',
        schema=SCHEMA,
    )
    evento_tipo = sa.Enum(
        'iniciado', 'guardado', 'enviado', 'expirado', 'reabierto',
        name='sieej_evento_tipo',
        schema=SCHEMA,
    )

    op.create_table(
        "formulario",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("slug", sa.String(length=128), nullable=False),
        sa.Column("nombre", sa.String(length=255), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("definicion", sa.JSON(), nullable=False),
        sa.Column(
            "estado",
            formulario_estado,
            nullable=False,
            server_default="borrador",
        ),
        sa.Column("vigencia_inicio", sa.DateTime(timezone=True), nullable=True),
        sa.Column("vigencia_fin", sa.DateTime(timezone=True), nullable=True),
        sa.Column("publico", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("creado_por_id", sa.Integer(), nullable=False),
        sa.Column("creado_en", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("actualizado_en", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["creado_por_id"], ["usuarios.id"], ondelete="RESTRICT"),
        sa.UniqueConstraint("slug", name="uq_formulario_slug"),
        schema=SCHEMA,
    )
    op.create_index("ix_formulario_slug", "formulario", ["slug"], schema=SCHEMA, unique=True)
    op.create_index("ix_formulario_estado", "formulario", ["estado"], schema=SCHEMA)

    op.create_table(
        "grupo",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nombre", sa.String(length=128), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("creado_en", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("nombre", name="uq_grupo_nombre"),
        schema=SCHEMA,
    )

    op.create_table(
        "usuario_grupo",
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("grupo_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["grupo_id"], [f"{SCHEMA}.grupo.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("usuario_id", "grupo_id"),
        schema=SCHEMA,
    )
    op.create_index("ix_usuario_grupo_grupo_id", "usuario_grupo", ["grupo_id"], schema=SCHEMA)

    op.create_table(
        "formulario_grupo",
        sa.Column("formulario_id", sa.Integer(), nullable=False),
        sa.Column("grupo_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["formulario_id"], [f"{SCHEMA}.formulario.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["grupo_id"], [f"{SCHEMA}.grupo.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("formulario_id", "grupo_id"),
        schema=SCHEMA,
    )
    op.create_index("ix_formulario_grupo_grupo_id", "formulario_grupo", ["grupo_id"], schema=SCHEMA)

    op.create_table(
        "formulario_usuario",
        sa.Column("formulario_id", sa.Integer(), nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["formulario_id"], [f"{SCHEMA}.formulario.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("formulario_id", "usuario_id"),
        schema=SCHEMA,
    )
    op.create_index("ix_formulario_usuario_usuario_id", "formulario_usuario", ["usuario_id"], schema=SCHEMA)

    op.create_table(
        "envio_formulario",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("formulario_id", sa.Integer(), nullable=False),
        sa.Column("formulario_version", sa.Integer(), nullable=False),
        sa.Column("definicion_snapshot", sa.JSON(), nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=True),
        sa.Column(
            "estado",
            envio_estado,
            nullable=False,
            server_default="en_proceso",
        ),
        sa.Column("datos", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("paso_actual", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("iniciado_en", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("enviado_en", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expirado_en", sa.DateTime(timezone=True), nullable=True),
        sa.Column("actualizado_en", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["formulario_id"], [f"{SCHEMA}.formulario.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("formulario_id", "usuario_id", name="uq_envio_formulario_user"),
        schema=SCHEMA,
    )
    op.create_index("ix_envio_formulario_usuario_id", "envio_formulario", ["usuario_id"], schema=SCHEMA)
    op.create_index("ix_envio_formulario_estado", "envio_formulario", ["estado"], schema=SCHEMA)

    op.create_table(
        "envio_archivo",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("envio_id", sa.Integer(), nullable=False),
        sa.Column("field_path", sa.String(length=512), nullable=False),
        sa.Column("bucket", sa.String(length=128), nullable=False),
        sa.Column("object_key", sa.String(length=512), nullable=False),
        sa.Column("url_publica", sa.String(length=1024), nullable=True),
        sa.Column("filename_original", sa.String(length=255), nullable=False),
        sa.Column("mime", sa.String(length=128), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("subido_en", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["envio_id"], [f"{SCHEMA}.envio_formulario.id"], ondelete="CASCADE"),
        schema=SCHEMA,
    )
    op.create_index(
        "ix_envio_archivo_envio_field",
        "envio_archivo",
        ["envio_id", "field_path"],
        schema=SCHEMA,
    )

    op.create_table(
        "envio_evento",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("envio_id", sa.Integer(), nullable=False),
        sa.Column("tipo", evento_tipo, nullable=False),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.Column("actor_usuario_id", sa.Integer(), nullable=True),
        sa.Column("ocurrido_en", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["envio_id"], [f"{SCHEMA}.envio_formulario.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["actor_usuario_id"], ["usuarios.id"], ondelete="SET NULL"),
        schema=SCHEMA,
    )
    op.create_index(
        "ix_envio_evento_envio_ocurrido",
        "envio_evento",
        ["envio_id", "ocurrido_en"],
        schema=SCHEMA,
    )


def downgrade() -> None:
    op.drop_index("ix_envio_evento_envio_ocurrido", table_name="envio_evento", schema=SCHEMA)
    op.drop_table("envio_evento", schema=SCHEMA)

    op.drop_index("ix_envio_archivo_envio_field", table_name="envio_archivo", schema=SCHEMA)
    op.drop_table("envio_archivo", schema=SCHEMA)

    op.drop_index("ix_envio_formulario_estado", table_name="envio_formulario", schema=SCHEMA)
    op.drop_index("ix_envio_formulario_usuario_id", table_name="envio_formulario", schema=SCHEMA)
    op.drop_table("envio_formulario", schema=SCHEMA)

    op.drop_index("ix_formulario_usuario_usuario_id", table_name="formulario_usuario", schema=SCHEMA)
    op.drop_table("formulario_usuario", schema=SCHEMA)

    op.drop_index("ix_formulario_grupo_grupo_id", table_name="formulario_grupo", schema=SCHEMA)
    op.drop_table("formulario_grupo", schema=SCHEMA)

    op.drop_index("ix_usuario_grupo_grupo_id", table_name="usuario_grupo", schema=SCHEMA)
    op.drop_table("usuario_grupo", schema=SCHEMA)

    op.drop_table("grupo", schema=SCHEMA)

    op.drop_index("ix_formulario_estado", table_name="formulario", schema=SCHEMA)
    op.drop_index("ix_formulario_slug", table_name="formulario", schema=SCHEMA)
    op.drop_table("formulario", schema=SCHEMA)

    sa.Enum(name='sieej_evento_tipo', schema=SCHEMA).drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='sieej_envio_estado', schema=SCHEMA).drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='sieej_formulario_estado', schema=SCHEMA).drop(op.get_bind(), checkfirst=True)
