"""borradores de capas compartidos y registro de publicaciones para deshacer

Revision ID: pubc0001
Revises: v1ne0009

Los borradores de layer, layer_metadata y layer_stats pasan a ser uno por recurso,
editable por quien tenga permiso. Si ya habia varios activos del mismo recurso, se
fusionan campo por campo en el mas reciente. publicaciones_capas guarda el antes y
el despues de cada publicacion para poder deshacer la ultima.
"""
import json
from collections import defaultdict

import sqlalchemy as sa

from alembic import op

revision = "pubc0001"
down_revision = "v1ne0009"
branch_labels = None
depends_on = None

ACTIVOS = "estado IN ('en_progreso', 'pendiente_revision', 'rechazado')"
COMPARTIDOS = "resource_type IN ('layer', 'layer_metadata', 'layer_stats')"


def _como_dict(valor: object) -> dict:
    if isinstance(valor, dict):
        return valor
    if isinstance(valor, str) and valor:
        return json.loads(valor)
    return {}


def _fusionar_duplicados() -> None:
    conn = op.get_bind()
    filas = conn.execute(sa.text(f"""
        SELECT b.id, b.resource_type, b.resource_id, b.data, u.username, u.name
        FROM borradores b JOIN usuarios u ON u.id = b.usuario_id
        WHERE b.{ACTIVOS} AND b.{COMPARTIDOS}
        ORDER BY b.resource_type, b.resource_id, b.actualizado_en, b.id
    """)).mappings().all()

    grupos: dict[tuple[str, str], list] = defaultdict(list)
    for fila in filas:
        grupos[(fila["resource_type"], fila["resource_id"])].append(fila)

    for grupo in grupos.values():
        data: dict = {}
        autores: dict = {}
        for fila in grupo:
            for campo, valor in _como_dict(fila["data"]).items():
                data[campo] = valor
                autores[campo] = {"usuario": fila["username"], "nombre": fila["name"], "version": 1}
        conservado = grupo[-1]["id"]
        conn.execute(
            sa.text("UPDATE borradores SET data = CAST(:data AS json), autores = CAST(:autores AS json) WHERE id = :id"),
            {"data": json.dumps(data), "autores": json.dumps(autores), "id": conservado},
        )
        sobrantes = [f["id"] for f in grupo[:-1]]
        if sobrantes:
            conn.execute(sa.text("DELETE FROM borradores WHERE id = ANY(:ids)"), {"ids": sobrantes})


def upgrade() -> None:
    op.add_column("borradores", sa.Column("version", sa.Integer(), nullable=False, server_default=sa.text("1")))
    op.add_column("borradores", sa.Column("autores", sa.JSON(), nullable=True))

    _fusionar_duplicados()

    op.execute("DROP INDEX IF EXISTS uq_borrador_recurso_usuario_activos")
    op.execute(f"""
        CREATE UNIQUE INDEX uq_borrador_recurso_usuario_activos
        ON borradores (resource_type, resource_id, usuario_id)
        WHERE {ACTIVOS} AND NOT ({COMPARTIDOS})
    """)
    op.execute(f"""
        CREATE UNIQUE INDEX uq_borrador_recurso_compartido_activos
        ON borradores (resource_type, resource_id)
        WHERE {ACTIVOS} AND {COMPARTIDOS}
    """)

    op.create_table(
        "publicaciones_capas",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("resource_type", sa.String(30), nullable=False),
        sa.Column("resource_id", sa.String(300), nullable=False),
        sa.Column("antes", sa.JSON(), nullable=False),
        sa.Column("despues", sa.JSON(), nullable=False),
        sa.Column("usuario", sa.String(150), nullable=True),
        sa.Column("origen", sa.String(20), nullable=False, server_default="editor"),
        sa.Column("deshace_id", sa.Integer(), sa.ForeignKey("publicaciones_capas.id"), nullable=True),
        sa.Column("deshecha_en", sa.DateTime(), nullable=True),
        sa.Column("deshecha_por", sa.String(150), nullable=True),
        sa.Column("creado_en", sa.DateTime(), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_publicaciones_capas_id", "publicaciones_capas", ["id"])
    op.create_index(
        "ix_publicaciones_capas_recurso",
        "publicaciones_capas",
        ["resource_type", "resource_id", "creado_en"],
    )


def downgrade() -> None:
    op.drop_index("ix_publicaciones_capas_recurso", table_name="publicaciones_capas")
    op.drop_index("ix_publicaciones_capas_id", table_name="publicaciones_capas")
    op.drop_table("publicaciones_capas")
    op.execute("DROP INDEX IF EXISTS uq_borrador_recurso_compartido_activos")
    op.execute("DROP INDEX IF EXISTS uq_borrador_recurso_usuario_activos")
    op.execute(f"""
        CREATE UNIQUE INDEX uq_borrador_recurso_usuario_activos
        ON borradores (resource_type, resource_id, usuario_id)
        WHERE {ACTIVOS}
    """)
    op.drop_column("borradores", "autores")
    op.drop_column("borradores", "version")
