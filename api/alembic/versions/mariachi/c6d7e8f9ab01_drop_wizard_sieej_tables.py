"""drop wizard SIEEJ tables (general, enlace, bases_datos, bd_ejes_estrategicos)

Revision ID: c6d7e8f9ab01
Revises: b5c6d7e8f9aa
Create Date: 2026-05-06 16:00:00.000000

Cleanup post-migracion del wizard SIEEJ a la plataforma de formularios
dinamicos. Los datos historicos viven en `envio_formulario.datos`
(JSONB) del formulario `sieej-levantamiento`. Los catalogos
(`catalogo_*`) se mantienen porque siguen siendo referenciados por la
definicion JSON via `field.catalog`.

Antes de aplicar esta migration, asegurar que el backfill corrio:
    docker compose exec api python scripts/backfill_sieej_levantamiento.py

El downgrade recrea los esquemas de las tablas pero no restaura datos.
"""
import sqlalchemy as sa
from alembic import op


revision = 'c6d7e8f9ab01'
down_revision = 'b5c6d7e8f9aa'
branch_labels = None
depends_on = None

SCHEMA = "sieej"


def upgrade() -> None:
    op.drop_table("bd_ejes_estrategicos", schema=SCHEMA)
    op.drop_index("ix_bases_datos_user_id", table_name="bases_datos", schema=SCHEMA)
    op.drop_table("bases_datos", schema=SCHEMA)
    op.drop_index("ix_enlace_user_id", table_name="enlace", schema=SCHEMA)
    op.drop_table("enlace", schema=SCHEMA)
    op.drop_index("ix_general_user_id", table_name="general", schema=SCHEMA)
    op.drop_table("general", schema=SCHEMA)


def downgrade() -> None:
    """Recrea los esquemas de las tablas eliminadas. NO restaura datos.

    Si se necesita rollback con datos, hay que correr esta migration en
    reversa, luego restaurar desde un backup de Postgres antes del
    upgrade original.
    """
    op.create_table(
        "general",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("unidad_admin_id", sa.Integer(), nullable=True),
        sa.Column("nombre_ente_gobierno", sa.String(), nullable=False),
        sa.Column("hay_responsable", sa.Boolean(), nullable=False),
        sa.Column("descripcion_hay_responsable", sa.Text(), nullable=True),
        sa.Column("desafios_oportunidades", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["unidad_admin_id"], [f"{SCHEMA}.catalogo_unidad_admin.id"], ondelete="RESTRICT"
        ),
        schema=SCHEMA,
    )
    op.create_index("ix_general_user_id", "general", ["user_id"], schema=SCHEMA)

    op.create_table(
        "enlace",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("nombres", sa.String(), nullable=False),
        sa.Column("apellido1", sa.String(), nullable=False),
        sa.Column("apellido2", sa.String(), nullable=False),
        sa.Column("direccion", sa.String(), nullable=False),
        sa.Column("puesto", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("extension", sa.String(), nullable=True),
        sa.Column("telefono", sa.String(), nullable=False),
        sa.Column("es_tecnico", sa.Boolean(), nullable=False),
        sa.Column("nombres_jefe", sa.String(), nullable=False),
        sa.Column("apellido1_jefe", sa.String(), nullable=False),
        sa.Column("apellido2_jefe", sa.String(), nullable=False),
        sa.Column("puesto_jefe", sa.String(), nullable=False),
        sa.Column("email_jefe", sa.String(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["usuarios.id"], ondelete="CASCADE"),
        schema=SCHEMA,
    )
    op.create_index("ix_enlace_user_id", "enlace", ["user_id"], schema=SCHEMA)

    op.create_table(
        "bases_datos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("nombre_bd", sa.String(), nullable=False),
        sa.Column("descripcion_bd", sa.Text(), nullable=False),
        sa.Column("categoria_datos_id", sa.Integer(), nullable=True),
        sa.Column("herramientas_gestion_id", sa.Integer(), nullable=True),
        sa.Column("calidad_datos_id", sa.Integer(), nullable=True),
        sa.Column("periodicidad_id", sa.Integer(), nullable=True),
        sa.Column("objetivo_uso_id", sa.Integer(), nullable=True),
        sa.Column("usuarios_datos_id", sa.Integer(), nullable=True),
        sa.Column("limpieza_validacion", sa.Boolean(), nullable=True),
        sa.Column("desc_limpieza_validacion", sa.Text(), nullable=True),
        sa.Column("proveedores_bd", sa.Text(), nullable=True),
        sa.Column("desc_periodicidad", sa.Text(), nullable=True),
        sa.Column("tiene_diccionario", sa.Boolean(), nullable=True),
        sa.Column("ruta_diccionario", sa.String(), nullable=True),
        sa.Column("quienes_son", sa.Text(), nullable=True),
        sa.Column("historicos", sa.Boolean(), nullable=True),
        sa.Column("desc_historicos", sa.Text(), nullable=True),
        sa.Column("migracion_actualizacion", sa.Boolean(), nullable=True),
        sa.Column("desc_migracion_actualizacion", sa.Text(), nullable=True),
        sa.Column("medidas_seguridad", sa.Boolean(), nullable=True),
        sa.Column("desc_medidas_seguridad", sa.Text(), nullable=True),
        sa.Column("normativas_proteccion", sa.Boolean(), nullable=True),
        sa.Column("desc_normativas_proteccion", sa.Text(), nullable=True),
        sa.Column("plan_contingencia", sa.Boolean(), nullable=True),
        sa.Column("desc_plan_contingencia", sa.Text(), nullable=True),
        sa.Column("interoperatividad", sa.Boolean(), nullable=True),
        sa.Column("desc_interoperatividad", sa.Text(), nullable=True),
        sa.Column("plataforma_difusion", sa.Boolean(), nullable=True),
        sa.Column("nombre_plataforma_difusion", sa.String(), nullable=True),
        sa.Column("url_plataforma_difusion", sa.String(), nullable=True),
        sa.Column("retos", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["categoria_datos_id"], [f"{SCHEMA}.catalogo_categoria_datos.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["herramientas_gestion_id"],
            [f"{SCHEMA}.catalogo_herramientas_gestion.id"],
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["calidad_datos_id"], [f"{SCHEMA}.catalogo_calidad_datos.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["periodicidad_id"], [f"{SCHEMA}.catalogo_periodicidad.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["objetivo_uso_id"], [f"{SCHEMA}.catalogo_objetivo_uso.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["usuarios_datos_id"], [f"{SCHEMA}.catalogo_usuarios_datos.id"], ondelete="RESTRICT"
        ),
        schema=SCHEMA,
    )
    op.create_index("ix_bases_datos_user_id", "bases_datos", ["user_id"], schema=SCHEMA)

    op.create_table(
        "bd_ejes_estrategicos",
        sa.Column("id_bases_datos", sa.Integer(), nullable=False),
        sa.Column("id_eje_estrategico", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["id_bases_datos"], [f"{SCHEMA}.bases_datos.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["id_eje_estrategico"],
            [f"{SCHEMA}.catalogo_ejes_estrategicos.id"],
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id_bases_datos", "id_eje_estrategico"),
        schema=SCHEMA,
    )
