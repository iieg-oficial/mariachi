"""init sieej schema (catalogos, general, enlace, bases_datos)

Revision ID: e7f8a9b0c1d2
Revises: d1e2f3a4b5c6
Create Date: 2026-04-24 22:00:00.000000

Crea schema dedicado 'sieej' con:
  - 8 catálogos (unidad_admin, categoria_datos, herramientas_gestion,
    calidad_datos, periodicidad, objetivo_uso, usuarios_datos,
    ejes_estrategicos)
  - 3 tablas de dominio (general, enlace, bases_datos)
  - 1 tabla de asociación N:M (bd_ejes_estrategicos)
  - Seed de los 8 catálogos desde data/sieej/*.json
  - MediaBucket 'sieej-diccionarios' para subida de diccionarios via Acervo
"""
import json
from pathlib import Path

import sqlalchemy as sa
from alembic import op


revision = 'e7f8a9b0c1d2'
down_revision = 'd1e2f3a4b5c6'
branch_labels = None
depends_on = None


SCHEMA = "sieej"
DATA_DIR = Path(__file__).resolve().parents[3] / "data" / "sieej"

CATALOG_FILES = [
    ("unidad_administrativa.json", "unidades", "catalogo_unidad_admin"),
    ("categoria_datos.json", "categoria_datos", "catalogo_categoria_datos"),
    ("herramientas_gestion.json", "herramientas_gestion", "catalogo_herramientas_gestion"),
    ("calidad_datos.json", "calidad_datos", "catalogo_calidad_datos"),
    ("periodicidad.json", "periodicidad", "catalogo_periodicidad"),
    ("objetivo_uso.json", "objetivo_uso", "catalogo_objetivo_uso"),
    ("usuarios_datos.json", "usuarios_datos", "catalogo_usuarios_datos"),
    ("ejes_estrategicos.json", "ejes_estrategicos", "catalogo_ejes_estrategicos"),
]


def _create_catalog(name: str) -> None:
    op.create_table(
        name,
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("value", sa.String(), nullable=False),
        sa.UniqueConstraint("value", name=f"uq_{name}_value"),
        schema=SCHEMA,
    )
    op.create_index(f"ix_{name}_value", name, ["value"], unique=True, schema=SCHEMA)


def upgrade() -> None:
    op.execute(f"CREATE SCHEMA IF NOT EXISTS {SCHEMA}")

    for _, _, table in CATALOG_FILES:
        _create_catalog(table)

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

    # Seed de catálogos desde JSON
    conn = op.get_bind()
    for filename, json_key, table in CATALOG_FILES:
        path = DATA_DIR / filename
        with path.open(encoding="utf-8") as f:
            payload = json.load(f)
        values = payload[json_key]
        rows = [{"value": v} for v in values]
        conn.execute(sa.text(f'INSERT INTO {SCHEMA}.{table} (value) VALUES (:value)'), rows)

    # MediaBucket para diccionarios SIEEJ (project 'sieej' ya existe en c0d1e2f3a4b5)
    conn.execute(
        sa.text("""
            INSERT INTO media_buckets (project_id, acervo_bucket, access_key_ref, display_name, is_public, is_active, created_at)
            SELECT p.id, 'sieej-diccionarios', 'ACERVO_SIEEJ', 'Diccionarios de bases de datos SIEEJ', false, true, NOW()
            FROM projects p
            WHERE p.slug = 'sieej'
            ON CONFLICT DO NOTHING
        """)
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text("DELETE FROM media_buckets WHERE acervo_bucket = 'sieej-diccionarios'")
    )

    op.drop_table("bd_ejes_estrategicos", schema=SCHEMA)
    op.drop_index("ix_bases_datos_user_id", table_name="bases_datos", schema=SCHEMA)
    op.drop_table("bases_datos", schema=SCHEMA)
    op.drop_index("ix_enlace_user_id", table_name="enlace", schema=SCHEMA)
    op.drop_table("enlace", schema=SCHEMA)
    op.drop_index("ix_general_user_id", table_name="general", schema=SCHEMA)
    op.drop_table("general", schema=SCHEMA)
    for _, _, table in reversed(CATALOG_FILES):
        op.drop_index(f"ix_{table}_value", table_name=table, schema=SCHEMA)
        op.drop_table(table, schema=SCHEMA)
    op.execute(f"DROP SCHEMA IF EXISTS {SCHEMA}")
