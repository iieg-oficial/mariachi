"""actividad: mover el audit log al schema huachicol como `actividad`

Revision ID: dab0act1v1dad
Revises: dab0c01a99ee
Create Date: 2026-07-21 12:00:00.000000

Actividad ya vive en el menu Huachicol; su tabla se une a la telemetria en el
schema `huachicol`. `actividad_log` (public) pasa a `huachicol.actividad`. Todo
el acceso es ORM (helper de registro + endpoint de listado), asi que solo cambia
el schema del modelo. SET SCHEMA + RENAME es metadata-only: preserva los datos.
La FK a `public.usuarios` queda cross-schema.
"""
from alembic import op

revision = "dab0act1v1dad"
down_revision = "dab0c01a99ee"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE public.actividad_log SET SCHEMA huachicol")
    op.execute("ALTER TABLE huachicol.actividad_log RENAME TO actividad")


def downgrade() -> None:
    op.execute("ALTER TABLE huachicol.actividad RENAME TO actividad_log")
    op.execute("ALTER TABLE huachicol.actividad_log SET SCHEMA public")
