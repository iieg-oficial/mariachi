"""mel: renombra el schema identidad, sus indices, sus constraints y sus hitos

Revision ID: m3l0001
Revises: r0adm4p0002
Create Date: 2026-09-02

"""

from alembic import op

revision = "m3l0001"
down_revision = "r0adm4p0002"
branch_labels = None
depends_on = None


INDICES = (
    ("ix_identidad_marcas_codigo", "ix_mel_marcas_codigo"),
    ("ix_identidad_tokens_marca_id", "ix_mel_tokens_marca_id"),
    ("ix_identidad_tokens_grupo", "ix_mel_tokens_grupo"),
    ("ix_identidad_campos_marca_id", "ix_mel_campos_marca_id"),
    ("ix_identidad_fuentes_marca_id", "ix_mel_fuentes_marca_id"),
)

CONSTRAINTS = (
    ("tokens", "uq_identidad_token", "uq_mel_token"),
    ("campos", "uq_identidad_campo", "uq_mel_campo"),
    ("fuentes", "uq_identidad_fuente", "uq_mel_fuente"),
)

# El seed de r0adm4p0001 ya trae los nombres nuevos, asi que en una base recien
# creada estos UPDATE no tocan ninguna fila. Existen para las bases que ya
# corrieron aquella migracion, donde el panel seguiria diciendo "identidad".
HITOS_ARRIBA = (
    "UPDATE roadmap_hitos SET clave = 'mel', etiqueta = 'mel', proyecto = 'mel',"
    " nombre_anterior = 'identidad' WHERE clave = 'identidad'",
    "UPDATE roadmap_hitos SET clave = 'f-mel-tokens', etiqueta = 'MEL · Tokens y temas',"
    " proyecto = 'mel', feature_de = 'mel' WHERE clave = 'f-identidad-tokens'",
)

HITOS_ABAJO = (
    "UPDATE roadmap_hitos SET clave = 'identidad', etiqueta = 'identidad',"
    " proyecto = 'identidad', nombre_anterior = NULL WHERE clave = 'mel'",
    "UPDATE roadmap_hitos SET clave = 'f-identidad-tokens', etiqueta = 'identidad · Tokens y temas',"
    " proyecto = 'identidad', feature_de = 'identidad' WHERE clave = 'f-mel-tokens'",
)


def upgrade() -> None:
    op.execute("ALTER SCHEMA identidad RENAME TO mel")
    for viejo, nuevo in INDICES:
        op.execute(f"ALTER INDEX mel.{viejo} RENAME TO {nuevo}")
    for tabla, viejo, nuevo in CONSTRAINTS:
        op.execute(f"ALTER TABLE mel.{tabla} RENAME CONSTRAINT {viejo} TO {nuevo}")
    for sentencia in HITOS_ARRIBA:
        op.execute(sentencia)


def downgrade() -> None:
    for sentencia in HITOS_ABAJO:
        op.execute(sentencia)
    for tabla, viejo, nuevo in CONSTRAINTS:
        op.execute(f"ALTER TABLE mel.{tabla} RENAME CONSTRAINT {nuevo} TO {viejo}")
    for viejo, nuevo in INDICES:
        op.execute(f"ALTER INDEX mel.{nuevo} RENAME TO {viejo}")
    op.execute("ALTER SCHEMA mel RENAME TO identidad")
