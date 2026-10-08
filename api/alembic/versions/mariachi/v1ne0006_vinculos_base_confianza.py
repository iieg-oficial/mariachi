"""base y confianza como vinculos propios

Revision ID: v1ne0006
Revises: v1ne0005
"""
from alembic import op
import sqlalchemy as sa

revision = "v1ne0006"
down_revision = "v1ne0005"
branch_labels = None
depends_on = None

SCHEMA = "vine"

# El biometrico no distingue base de confianza: su departamento manda a todo el
# personal de nomina a "Plantilla". Se capturan a mano en la ficha, y hasta que
# alguien los asigne estos dos quedan en cero sin romper nada.
SEMILLA = [
    ("base", "Base", "blue"),
    ("confianza", "Confianza", "geekblue"),
]

# El `orden` del catalogo decide el orden del segmento en el directorio, asi que
# se reescribe entero: dejar los dos nuevos en 1 y 2 los empataria con practicas
# y servicio social, y dos claves con el mismo orden salen en orden arbitrario.
ORDEN = {
    "base": 1,
    "confianza": 2,
    "plantilla": 3,
    "practicas": 4,
    "servicio_social": 5,
    "delfin": 6,
    "asimilados": 7,
    "empleo_temporal": 8,
    "limpieza": 9,
}

ORDEN_PREVIO = {
    "plantilla": 1,
    "practicas": 2,
    "servicio_social": 3,
    "delfin": 4,
    "asimilados": 5,
    "empleo_temporal": 6,
    "limpieza": 7,
}


def upgrade() -> None:
    tabla = sa.table(
        "catalogos",
        sa.column("tipo", sa.String),
        sa.column("clave", sa.String),
        sa.column("nombre", sa.String),
        sa.column("color", sa.String),
        sa.column("orden", sa.Integer),
        schema=SCHEMA,
    )
    op.bulk_insert(
        tabla,
        [
            {
                "tipo": "vinculo",
                "clave": clave,
                "nombre": nombre,
                "color": color,
            }
            for clave, nombre, color in SEMILLA
        ],
    )
    for clave, orden in ORDEN.items():
        op.execute(
            f"UPDATE {SCHEMA}.catalogos SET orden = {orden} "
            f"WHERE tipo = 'vinculo' AND clave = '{clave}'"
        )


def downgrade() -> None:
    claves = ", ".join(f"'{clave}'" for clave, _, _ in SEMILLA)
    op.execute(
        f"DELETE FROM {SCHEMA}.catalogos WHERE tipo = 'vinculo' AND clave IN ({claves})"
    )
    for clave, orden in ORDEN_PREVIO.items():
        op.execute(
            f"UPDATE {SCHEMA}.catalogos SET orden = {orden} "
            f"WHERE tipo = 'vinculo' AND clave = '{clave}'"
        )
