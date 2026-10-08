"""catalogos de vine: horarios, vinculos y tarjetas

Revision ID: v1ne0004
Revises: v1ne0003
"""
from alembic import op
import sqlalchemy as sa

revision = "v1ne0004"
down_revision = "v1ne0003"
branch_labels = None
depends_on = None

SCHEMA = "vine"

SEMILLA = [
    ("horario", "8-16", "8 a 4", "blue", "08:00", "16:00", 1),
    ("horario", "9-17", "9 a 5", "geekblue", "09:00", "17:00", 2),
    ("horario", "otro", "Sin horario fijo", "default", None, None, 99),
    ("vinculo", "plantilla", "Plantilla", "blue", None, None, 1),
    ("vinculo", "practicas", "Prácticas profesionales", "purple", None, None, 2),
    ("vinculo", "servicio_social", "Servicio social", "cyan", None, None, 3),
    ("vinculo", "delfin", "Delfín", "magenta", None, None, 4),
    ("vinculo", "asimilados", "Asimilados a salarios", "geekblue", None, None, 5),
    ("vinculo", "empleo_temporal", "Empleo temporal", "orange", None, None, 6),
    ("vinculo", "limpieza", "Limpieza", "gold", None, None, 7),
    ("vinculo", "baja", "Baja", "red", None, None, 98),
    ("vinculo", "sin_asignar", "Sin asignar", "default", None, None, 99),
]


def upgrade() -> None:
    op.create_table(
        "catalogos",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("tipo", sa.String(20), nullable=False),
        sa.Column("clave", sa.String(40), nullable=False),
        sa.Column("nombre", sa.String(120), nullable=False),
        sa.Column("color", sa.String(20)),
        sa.Column("entrada", sa.Time()),
        sa.Column("salida", sa.Time()),
        sa.Column("orden", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("notas", sa.Text()),
        sa.UniqueConstraint("tipo", "clave", name="uq_vine_catalogos_tipo_clave"),
        schema=SCHEMA,
    )
    op.create_index("ix_vine_catalogos_tipo", "catalogos", ["tipo", "orden"], schema=SCHEMA)

    tabla = sa.table(
        "catalogos",
        sa.column("tipo", sa.String),
        sa.column("clave", sa.String),
        sa.column("nombre", sa.String),
        sa.column("color", sa.String),
        sa.column("entrada", sa.Time),
        sa.column("salida", sa.Time),
        sa.column("orden", sa.Integer),
        schema=SCHEMA,
    )
    op.bulk_insert(
        tabla,
        [
            {
                "tipo": tipo,
                "clave": clave,
                "nombre": nombre,
                "color": color,
                "entrada": entrada,
                "salida": salida,
                "orden": orden,
            }
            for tipo, clave, nombre, color, entrada, salida, orden in SEMILLA
        ],
    )

    op.add_column(
        "personas_ficha", sa.Column("tarjeta", sa.String(40)), schema=SCHEMA
    )


def downgrade() -> None:
    op.drop_column("personas_ficha", "tarjeta", schema=SCHEMA)
    op.drop_index("ix_vine_catalogos_tipo", table_name="catalogos", schema=SCHEMA)
    op.drop_table("catalogos", schema=SCHEMA)
