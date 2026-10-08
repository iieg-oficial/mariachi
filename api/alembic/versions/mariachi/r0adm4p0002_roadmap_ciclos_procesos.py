"""roadmap ciclos y procesos

Revision ID: r0adm4p0002
Revises: r0adm4p0001
Create Date: 2026-09-01

"""

import sqlalchemy as sa

from alembic import op

revision = "r0adm4p0002"
down_revision = "r0adm4p0001"
branch_labels = None
depends_on = None


CICLOS = (
    ("c-infra", "estabilización de la infraestructura", "casi dos años", "El trabajo que no dejó releases porque no era código. El GitLab del instituto es de esta etapa: su proyecto más viejo es del 18 de diciembre de 2024.", "#2E4372", 60, 320, None, None, 0),
    ("c-sin", "sin ciclo con nombre", "construcción", "Del arranque del GitLab hasta que gateway-hub toma el ruteo. Los nombres de ciclo se acuñaron el 6 de agosto de 2026; antes no hay ninguno en los registros.", "#9A9AA2", 320, 703, None, None, 10),
    ("c-rojo", "tamal-rojo", "lo nuevo · cierra el 1 nov", "Doce frentes en seis quincenas, con minerva como motivo. Se commitea directo, sin ramas de feature.", "#B3261E", 1200, 1492, 46, 400, 20),
    ("c-verde", "tamal-verde", "mar — sep 2026 · cierra con sitio2026", "Arrancó casi junto con gateway-hub y cierra con el despliegue de sitio2026, a mediados de septiembre. Desde el 6 de agosto solo recibe fixes.", "#1F7A4D", 703, 1330, 400, 806, 30),
    ("c-prox", "próximos ciclos", "sin nombre ni fecha", "Ningún archivo del ecosistema tiene una fecha comprometida después del 1 de noviembre de 2026.", "#9A9AA2", 1492, 2340, 46, 400, 40),
)
PROCESOS = (
    ("cuadernillos", "cuadernillos municipales", "cuadernillos", "2026-03-23", "03-23", "anual · desde el 23 mar 2026", "Proceso anual, no un release: un PDF por cada uno de los 125 municipios, de PostgreSQL a LaTeX. Solo la primera edición tiene fecha registrada; las demás son la periodicidad.", 0),
)

COLUMNAS_CICLO = ("clave", "nombre", "nota", "motivo", "color", "x0", "x1", "y0", "y1", "orden")
COLUMNAS_PROCESO = ("clave", "etiqueta", "proyecto", "desde", "cada", "fecha_texto", "motivo", "orden")


def upgrade() -> None:
    ciclos = op.create_table(
        "roadmap_ciclos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("clave", sa.String(length=60), nullable=False),
        sa.Column("nombre", sa.String(length=120), nullable=False),
        sa.Column("nota", sa.String(length=120), nullable=False, server_default=""),
        sa.Column("motivo", sa.Text(), nullable=False, server_default=""),
        sa.Column("color", sa.String(length=9), nullable=False),
        sa.Column("x0", sa.Float(), nullable=False),
        sa.Column("x1", sa.Float(), nullable=False),
        sa.Column("y0", sa.Float(), nullable=True),
        sa.Column("y1", sa.Float(), nullable=True),
        sa.Column("orden", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_roadmap_ciclos_clave", "roadmap_ciclos", ["clave"], unique=True)
    op.bulk_insert(ciclos, [dict(zip(COLUMNAS_CICLO, fila)) for fila in CICLOS])

    procesos = op.create_table(
        "roadmap_procesos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("clave", sa.String(length=60), nullable=False),
        sa.Column("etiqueta", sa.String(length=120), nullable=False),
        sa.Column("proyecto", sa.String(length=40), nullable=False),
        sa.Column("desde", sa.String(length=10), nullable=False),
        sa.Column("cada", sa.String(length=5), nullable=False),
        sa.Column("fecha_texto", sa.String(length=80), nullable=False),
        sa.Column("motivo", sa.Text(), nullable=False),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("orden", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_roadmap_procesos_clave", "roadmap_procesos", ["clave"], unique=True)
    op.bulk_insert(procesos, [dict(zip(COLUMNAS_PROCESO, fila)) for fila in PROCESOS])


def downgrade() -> None:
    op.drop_index("ix_roadmap_procesos_clave", table_name="roadmap_procesos")
    op.drop_table("roadmap_procesos")
    op.drop_index("ix_roadmap_ciclos_clave", table_name="roadmap_ciclos")
    op.drop_table("roadmap_ciclos")
