"""acervo: marcar buckets como protegidos contra escritura desde el explorador

El explorador del CMS deja borrar, renombrar y sobreescribir objetos. En un
bucket como el de SIEEJ eso es destructivo: los archivos son la entrega de una
dependencia y su clave esta referenciada desde `sieej.envio_archivo` y desde
`envio_formulario.datos`. Un borrado a mano deja el formulario apuntando a un
objeto inexistente.

`protegido` marca los buckets cuyo contenido lo gestiona una aplicacion y no
se toca a mano: el API rechaza ahi las operaciones de escritura y el
explorador oculta esas acciones. Marca `sieej` de entrada; los demas quedan
como estaban.

Revision ID: c4d5e6f7a8b0
Revises: c3d4e5f6a7b9
Create Date: 2026-07-27

"""

import sqlalchemy as sa

from alembic import op

revision = "c4d5e6f7a8b0"
down_revision = "c3d4e5f6a7b9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "buckets",
        sa.Column(
            "protegido",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        schema="acervo",
    )
    op.execute(
        sa.text(
            "UPDATE acervo.buckets SET protegido = true WHERE acervo_bucket = 'sieej'"
        )
    )


def downgrade() -> None:
    op.drop_column("buckets", "protegido", schema="acervo")
