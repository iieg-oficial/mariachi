"""sieej: envios de grupo, rol de miembro y cursor de version

Revision ID: s1eej0001
Revises: v1ne0008
"""
from alembic import op
import sqlalchemy as sa

revision = "s1eej0001"
down_revision = "v1ne0008"
branch_labels = None
depends_on = None

SCHEMA = "sieej"

grupo_rol = sa.Enum(
    "coordinador", "capturista", name="sieej_grupo_rol", schema=SCHEMA
)
historial_origen = sa.Enum(
    "captura", "correccion", name="sieej_historial_origen", schema=SCHEMA
)


def upgrade() -> None:
    bind = op.get_bind()
    grupo_rol.create(bind, checkfirst=True)
    historial_origen.create(bind, checkfirst=True)

    op.add_column(
        "formulario",
        sa.Column(
            "colaborativo",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        schema=SCHEMA,
    )
    op.add_column(
        "usuario_grupo",
        sa.Column(
            "rol", grupo_rol, nullable=False, server_default="capturista"
        ),
        schema=SCHEMA,
    )

    op.add_column(
        "envio_formulario",
        sa.Column("grupo_id", sa.Integer(), nullable=True),
        schema=SCHEMA,
    )
    op.create_foreign_key(
        "fk_envio_formulario_grupo_id",
        "envio_formulario",
        "grupo",
        ["grupo_id"],
        ["id"],
        source_schema=SCHEMA,
        referent_schema=SCHEMA,
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_envio_formulario_grupo_id",
        "envio_formulario",
        ["grupo_id"],
        schema=SCHEMA,
    )
    op.add_column(
        "envio_formulario",
        sa.Column(
            "datos_version", sa.Integer(), nullable=False, server_default="0"
        ),
        schema=SCHEMA,
    )

    op.add_column(
        "envio_valor_historial",
        sa.Column(
            "datos_version", sa.Integer(), nullable=False, server_default="0"
        ),
        schema=SCHEMA,
    )
    # Todo lo ya escrito salio del flujo de correccion post-envio: es el unico
    # que existia antes de esta revision.
    op.add_column(
        "envio_valor_historial",
        sa.Column(
            "origen",
            historial_origen,
            nullable=False,
            server_default="correccion",
        ),
        schema=SCHEMA,
    )
    op.create_index(
        "ix_historial_envio_path_fecha",
        "envio_valor_historial",
        ["envio_id", "field_path", sa.text("cambiado_en DESC")],
        schema=SCHEMA,
    )

    # Los de grupo primero: entre el drop y el create de los individuales la
    # tabla queda un instante sin su unicidad, y el orden acota la ventana.
    op.create_index(
        "uq_envio_grupo_periodo",
        "envio_formulario",
        ["formulario_id", "grupo_id", "periodo_id"],
        unique=True,
        schema=SCHEMA,
        postgresql_where=sa.text("grupo_id IS NOT NULL AND periodo_id IS NOT NULL"),
    )
    op.create_index(
        "uq_envio_grupo",
        "envio_formulario",
        ["formulario_id", "grupo_id"],
        unique=True,
        schema=SCHEMA,
        postgresql_where=sa.text("grupo_id IS NOT NULL AND periodo_id IS NULL"),
    )

    op.drop_index("uq_envio_formulario_periodo", "envio_formulario", schema=SCHEMA)
    op.create_index(
        "uq_envio_formulario_periodo",
        "envio_formulario",
        ["formulario_id", "usuario_id", "periodo_id"],
        unique=True,
        schema=SCHEMA,
        postgresql_where=sa.text("periodo_id IS NOT NULL AND grupo_id IS NULL"),
    )
    op.drop_index("uq_envio_formulario_user", "envio_formulario", schema=SCHEMA)
    op.create_index(
        "uq_envio_formulario_user",
        "envio_formulario",
        ["formulario_id", "usuario_id"],
        unique=True,
        schema=SCHEMA,
        postgresql_where=sa.text("periodo_id IS NULL AND grupo_id IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_envio_formulario_user", "envio_formulario", schema=SCHEMA)
    op.create_index(
        "uq_envio_formulario_user",
        "envio_formulario",
        ["formulario_id", "usuario_id"],
        unique=True,
        schema=SCHEMA,
        postgresql_where=sa.text("periodo_id IS NULL"),
    )
    op.drop_index("uq_envio_formulario_periodo", "envio_formulario", schema=SCHEMA)
    op.create_index(
        "uq_envio_formulario_periodo",
        "envio_formulario",
        ["formulario_id", "usuario_id", "periodo_id"],
        unique=True,
        schema=SCHEMA,
        postgresql_where=sa.text("periodo_id IS NOT NULL"),
    )
    op.drop_index("uq_envio_grupo", "envio_formulario", schema=SCHEMA)
    op.drop_index("uq_envio_grupo_periodo", "envio_formulario", schema=SCHEMA)

    op.drop_index(
        "ix_historial_envio_path_fecha", "envio_valor_historial", schema=SCHEMA
    )
    op.drop_column("envio_valor_historial", "origen", schema=SCHEMA)
    op.drop_column("envio_valor_historial", "datos_version", schema=SCHEMA)

    op.drop_column("envio_formulario", "datos_version", schema=SCHEMA)
    op.drop_index("ix_envio_formulario_grupo_id", "envio_formulario", schema=SCHEMA)
    op.drop_constraint(
        "fk_envio_formulario_grupo_id",
        "envio_formulario",
        type_="foreignkey",
        schema=SCHEMA,
    )
    op.drop_column("envio_formulario", "grupo_id", schema=SCHEMA)

    op.drop_column("usuario_grupo", "rol", schema=SCHEMA)
    op.drop_column("formulario", "colaborativo", schema=SCHEMA)

    bind = op.get_bind()
    historial_origen.drop(bind, checkfirst=True)
    grupo_rol.drop(bind, checkfirst=True)
