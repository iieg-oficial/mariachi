"""add role 'externo' to user_roles enum

Revision ID: f1a2b3c4d5e6
Revises: e7f8a9b0c1d2
Create Date: 2026-04-25 10:00:00.000000

Agrega el valor 'externo' al enum user_roles. Este rol identifica
usuarios fuera del staff IIEG (dependencias de gobierno cargando SIEEJ,
ciudadanos consultando mapalab autenticado, etc.). El acceso a productos
concretos sigue mediado por UserProject.

Postgres 12+ permite ALTER TYPE ... ADD VALUE dentro de transaccion (con
la restriccion de que el nuevo valor no se puede usar en la misma
transaccion). Alembic abre tx por migration, por lo que esta migration
solo agrega el valor; el primer Usuario con role='externo' se crea en
una tx posterior.
"""
from alembic import op


revision = 'f1a2b3c4d5e6'
down_revision = 'e7f8a9b0c1d2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # IF NOT EXISTS evita error si la migration se reaplica manualmente.
    op.execute("ALTER TYPE user_roles ADD VALUE IF NOT EXISTS 'externo'")


def downgrade() -> None:
    # Postgres no permite eliminar valores de un enum sin recrear el tipo.
    # Si se requiere revertir, hay que:
    #   1) reasignar usuarios con role='externo' a otro rol,
    #   2) recrear el tipo user_roles_old sin 'externo' y migrar columnas.
    # No se implementa el downgrade automatico para evitar perdida de datos.
    pass
