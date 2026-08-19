"""traer del biometrico ingreso, cumpleanos y telefono

Revision ID: v1ne0007
Revises: v1ne0006
"""
from alembic import op
import sqlalchemy as sa

revision = "v1ne0007"
down_revision = "v1ne0006"
branch_labels = None
depends_on = None

SCHEMA = "vine"

# Cuatro columnas que `pers_person` sí tiene y el sync no traía. Vienen casi
# vacías —hire_date en 3 de 293, birthday en 2, mobile_phone en 2— pero el dato
# es del biometrico y no de la ficha: capturarlo a mano aqui seria duplicar la
# fuente. `alta_sistema` es el unico con las 293: no es la fecha de contratacion
# sino la de alta en el control de acceso, y por eso va en columna aparte.
COLUMNAS = (
    ("fecha_ingreso", sa.Date()),
    ("cumpleanos", sa.Date()),
    ("telefono", sa.String(50)),
    ("alta_sistema", sa.Date()),
)


def upgrade() -> None:
    for nombre, tipo in COLUMNAS:
        op.add_column("personas", sa.Column(nombre, tipo), schema=SCHEMA)


def downgrade() -> None:
    for nombre, _ in reversed(COLUMNAS):
        op.drop_column("personas", nombre, schema=SCHEMA)
