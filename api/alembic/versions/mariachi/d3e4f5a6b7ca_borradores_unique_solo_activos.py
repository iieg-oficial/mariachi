"""borradores: unique constraint solo aplica a estados activos (no aprobados)

Revision ID: d3e4f5a6b7ca
Revises: f6c7d8e9a0b1
Create Date: 2026-05-13

Permite múltiples borradores aprobados por (resource_type, resource_id, usuario_id)
manteniendo el unique para borradores activos (en_progreso, pendiente_revision, rechazado).
Habilita historial de SLDs aplicados sin tabla nueva.
"""
from alembic import op


revision = "d3e4f5a6b7ca"
down_revision = "f6c7d8e9a0b1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("uq_borrador_recurso_usuario", "borradores", type_="unique")
    op.execute("""
        CREATE UNIQUE INDEX uq_borrador_recurso_usuario_activos
        ON borradores (resource_type, resource_id, usuario_id)
        WHERE estado IN ('en_progreso', 'pendiente_revision', 'rechazado')
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_borrador_recurso_usuario_activos")
    op.create_unique_constraint(
        "uq_borrador_recurso_usuario",
        "borradores",
        ["resource_type", "resource_id", "usuario_id"],
    )
