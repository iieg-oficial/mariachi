"""seed sieej-levantamiento formulario

Revision ID: b5c6d7e8f9aa
Revises: a4b5c6d7e8f9
Create Date: 2026-05-06 14:00:00.000000

Inserta el formulario `sieej-levantamiento` que replica el wizard SIEEJ
existente. Estado='activo' para que sea visible inmediatamente.

Para que el usuario lo vea, debe estar asignado individualmente o via
grupo. Esta migration NO crea asignaciones; el admin las gestiona desde
la UI o via UPDATE manual antes del cutover frontend (Fase 5 cleanup).

El backfill de datos existentes (general/enlaces/bases_datos -> envio)
vive en `scripts/backfill_sieej_levantamiento.py` y se corre manual
DESPUES de aplicar esta migration.
"""
import json

import sqlalchemy as sa
from alembic import op


revision = 'b5c6d7e8f9aa'
down_revision = 'a4b5c6d7e8f9'
branch_labels = None
depends_on = None

SCHEMA = "sieej"
SLUG = "sieej-levantamiento"


def _build_definicion() -> dict:
    return {
        "version": 1,
        "steps": [
            {
                "id": "general",
                "type": "form",
                "title": "Información general",
                "fields": [
                    {"name": "nombre_ente_gobierno", "label": "Nombre del ente de gobierno", "type": "text", "required": True},
                    {"name": "unidad_admin", "label": "Unidad administrativa", "type": "select", "catalog": "unidades_admin", "required": True},
                    {
                        "name": "hay_responsable",
                        "label": "¿Hay un responsable de datos asignado?",
                        "type": "radio",
                        "options": [{"value": "true", "label": "Sí"}, {"value": "false", "label": "No"}],
                        "required": True,
                    },
                    {
                        "name": "descripcion_hay_responsable",
                        "label": "Descripción del responsable",
                        "type": "textarea",
                        "showWhen": {"field": "hay_responsable", "equals": "true"},
                    },
                    {"name": "desafios_oportunidades", "label": "Desafíos y oportunidades", "type": "textarea", "required": True},
                ],
            },
            {
                "id": "enlaces",
                "type": "repeater",
                "title": "Enlaces tecnicos",
                "minItems": 1,
                "itemLabel": "Enlace {{index}}",
                "fields": [
                    {"name": "nombres", "label": "Nombres", "type": "text", "required": True},
                    {"name": "apellido1", "label": "Apellido paterno", "type": "text", "required": True},
                    {"name": "apellido2", "label": "Apellido materno", "type": "text", "required": True},
                    {"name": "direccion", "label": "Dirección", "type": "text", "required": True},
                    {"name": "puesto", "label": "Puesto", "type": "text", "required": True},
                    {"name": "email", "label": "Email", "type": "email", "required": True},
                    {"name": "telefono", "label": "Teléfono", "type": "tel", "required": True},
                    {"name": "extension", "label": "Extensión", "type": "text",
                     "validation": {"pattern": "^\\d{1,9}$"}},
                    {
                        "name": "es_tecnico",
                        "label": "¿Es enlace técnico?",
                        "type": "radio",
                        "options": [{"value": "true", "label": "Sí"}, {"value": "false", "label": "No"}],
                        "required": True,
                    },
                    {"name": "nombres_jefe", "label": "Nombre del jefe", "type": "text", "required": True},
                    {"name": "apellido1_jefe", "label": "Apellido paterno del jefe", "type": "text", "required": True},
                    {"name": "apellido2_jefe", "label": "Apellido materno del jefe", "type": "text", "required": True},
                    {"name": "puesto_jefe", "label": "Puesto del jefe", "type": "text", "required": True},
                    {"name": "email_jefe", "label": "Email del jefe", "type": "email", "required": True},
                ],
            },
            {
                "id": "bases_datos",
                "type": "repeater",
                "title": "Bases de datos",
                "minItems": 1,
                "itemLabel": "Base de datos {{index}}",
                "tabs": [
                    {"id": "datos", "title": "Datos generales"},
                    {"id": "calidad", "title": "Calidad y gestión"},
                    {"id": "diccionario", "title": "Diccionario"},
                ],
                "fields": [
                    {"name": "nombre_bd", "label": "Nombre de la BD", "type": "text", "required": True, "tab": "datos"},
                    {"name": "descripcion_bd", "label": "Descripción", "type": "textarea", "required": True, "tab": "datos"},
                    {"name": "categoria_datos", "label": "Categoría de datos", "type": "select", "catalog": "categoria_datos", "tab": "datos"},
                    {"name": "ejes_estrategicos", "label": "Ejes estratégicos", "type": "select_multiple", "catalog": "ejes_estrategicos", "tab": "datos"},
                    {"name": "periodicidad", "label": "Periodicidad", "type": "select", "catalog": "periodicidad", "tab": "datos"},
                    {"name": "desc_periodicidad", "label": "Descripción de la periodicidad", "type": "textarea", "tab": "datos"},
                    {"name": "objetivo_uso", "label": "Objetivo de uso", "type": "select", "catalog": "objetivo_uso", "tab": "datos"},
                    {"name": "usuarios_datos", "label": "Usuarios de los datos", "type": "select", "catalog": "usuarios_datos", "tab": "datos"},
                    {"name": "quienes_son", "label": "¿Quiénes son?", "type": "textarea", "tab": "datos"},
                    {"name": "proveedores_bd", "label": "Proveedores de la BD", "type": "textarea", "tab": "datos"},
                    {"name": "herramientas_gestion", "label": "Herramientas de gestion", "type": "select", "catalog": "herramientas_gestion", "tab": "calidad"},
                    {"name": "calidad_datos", "label": "Calidad de los datos", "type": "select", "catalog": "calidad_datos", "tab": "calidad"},
                    {
                        "name": "limpieza_validacion",
                        "label": "¿Hay limpieza/validación?",
                        "type": "radio",
                        "options": [{"value": "true", "label": "Sí"}, {"value": "false", "label": "No"}],
                        "tab": "calidad",
                    },
                    {
                        "name": "desc_limpieza_validacion",
                        "label": "Descripción de la limpieza",
                        "type": "textarea",
                        "showWhen": {"field": "limpieza_validacion", "equals": "true"},
                        "tab": "calidad",
                    },
                    {
                        "name": "historicos",
                        "label": "¿Mantienen históricos?",
                        "type": "radio",
                        "options": [{"value": "true", "label": "Sí"}, {"value": "false", "label": "No"}],
                        "tab": "calidad",
                    },
                    {
                        "name": "desc_historicos",
                        "label": "Detalle de históricos",
                        "type": "textarea",
                        "showWhen": {"field": "historicos", "equals": "true"},
                        "tab": "calidad",
                    },
                    {
                        "name": "migracion_actualizacion",
                        "label": "¿Migración o actualización?",
                        "type": "radio",
                        "options": [{"value": "true", "label": "Sí"}, {"value": "false", "label": "No"}],
                        "tab": "calidad",
                    },
                    {
                        "name": "desc_migracion_actualizacion",
                        "label": "Detalle migración/actualización",
                        "type": "textarea",
                        "showWhen": {"field": "migracion_actualizacion", "equals": "true"},
                        "tab": "calidad",
                    },
                    {
                        "name": "medidas_seguridad",
                        "label": "¿Medidas de seguridad?",
                        "type": "radio",
                        "options": [{"value": "true", "label": "Sí"}, {"value": "false", "label": "No"}],
                        "tab": "calidad",
                    },
                    {
                        "name": "desc_medidas_seguridad",
                        "label": "Detalle de seguridad",
                        "type": "textarea",
                        "showWhen": {"field": "medidas_seguridad", "equals": "true"},
                        "tab": "calidad",
                    },
                    {
                        "name": "normativas_proteccion",
                        "label": "¿Normativas de protección?",
                        "type": "radio",
                        "options": [{"value": "true", "label": "Sí"}, {"value": "false", "label": "No"}],
                        "tab": "calidad",
                    },
                    {
                        "name": "desc_normativas_proteccion",
                        "label": "Detalle de normativas",
                        "type": "textarea",
                        "showWhen": {"field": "normativas_proteccion", "equals": "true"},
                        "tab": "calidad",
                    },
                    {
                        "name": "plan_contingencia",
                        "label": "¿Plan de contingencia?",
                        "type": "radio",
                        "options": [{"value": "true", "label": "Sí"}, {"value": "false", "label": "No"}],
                        "tab": "calidad",
                    },
                    {
                        "name": "desc_plan_contingencia",
                        "label": "Detalle del plan",
                        "type": "textarea",
                        "showWhen": {"field": "plan_contingencia", "equals": "true"},
                        "tab": "calidad",
                    },
                    {
                        "name": "interoperatividad",
                        "label": "¿Interoperatividad?",
                        "type": "radio",
                        "options": [{"value": "true", "label": "Sí"}, {"value": "false", "label": "No"}],
                        "tab": "calidad",
                    },
                    {
                        "name": "desc_interoperatividad",
                        "label": "Detalle interoperatividad",
                        "type": "textarea",
                        "showWhen": {"field": "interoperatividad", "equals": "true"},
                        "tab": "calidad",
                    },
                    {
                        "name": "plataforma_difusion",
                        "label": "¿Plataforma de difusión?",
                        "type": "radio",
                        "options": [{"value": "true", "label": "Sí"}, {"value": "false", "label": "No"}],
                        "tab": "calidad",
                    },
                    {
                        "name": "nombre_plataforma_difusion",
                        "label": "Nombre de la plataforma",
                        "type": "text",
                        "showWhen": {"field": "plataforma_difusion", "equals": "true"},
                        "tab": "calidad",
                    },
                    {
                        "name": "url_plataforma_difusion",
                        "label": "URL de la plataforma",
                        "type": "text",
                        "showWhen": {"field": "plataforma_difusion", "equals": "true"},
                        "tab": "calidad",
                    },
                    {"name": "retos", "label": "Retos", "type": "textarea", "tab": "calidad"},
                    {
                        "name": "tiene_diccionario",
                        "label": "¿Tiene diccionario de datos?",
                        "type": "radio",
                        "options": [{"value": "true", "label": "Sí"}, {"value": "false", "label": "No"}],
                        "tab": "diccionario",
                    },
                    {
                        "name": "diccionario",
                        "label": "Archivo del diccionario",
                        "type": "file",
                        "bucket": "sieej-diccionarios",
                        "accept": [".csv", ".xlsx", ".xls", ".pdf"],
                        "maxSizeMB": 10,
                        "showWhen": {"field": "tiene_diccionario", "equals": "true"},
                        "tab": "diccionario",
                    },
                ],
            },
            {
                "id": "resumen",
                "type": "summary",
                "title": "Resumen",
                "exportPdf": True,
                "pdfTemplate": "sieej-levantamiento",
            },
        ],
    }


def upgrade() -> None:
    conn = op.get_bind()
    definicion = _build_definicion()

    # Buscar primer admin global como creador (fallback al user con id mas bajo).
    creador_id = conn.execute(
        sa.text("SELECT id FROM usuarios WHERE role='tetlamamakani' ORDER BY id LIMIT 1")
    ).scalar()
    if creador_id is None:
        creador_id = conn.execute(
            sa.text("SELECT id FROM usuarios ORDER BY id LIMIT 1")
        ).scalar()
    if creador_id is None:
        # No hay usuarios: skip el seed (DB vacia, p.ej. en CI).
        return

    existing = conn.execute(
        sa.text(f"SELECT id FROM {SCHEMA}.formulario WHERE slug = :slug").bindparams(slug=SLUG)
    ).scalar()
    if existing is not None:
        return  # idempotente

    conn.execute(
        sa.text(
            f"""
            INSERT INTO {SCHEMA}.formulario
                (slug, nombre, descripcion, definicion, estado, publico, version, creado_por_id, creado_en, actualizado_en)
            VALUES
                (:slug, :nombre, :descripcion, CAST(:definicion AS json), 'activo', false, 1, :creador_id, NOW(), NOW())
            """
        ).bindparams(
            slug=SLUG,
            nombre="Levantamiento SIEEJ",
            descripcion="Levantamiento institucional de informacion sobre bases de datos del Estado de Jalisco.",
            definicion=json.dumps(definicion),
            creador_id=creador_id,
        )
    )


def downgrade() -> None:
    op.execute(f"DELETE FROM {SCHEMA}.formulario WHERE slug = '{SLUG}'")
