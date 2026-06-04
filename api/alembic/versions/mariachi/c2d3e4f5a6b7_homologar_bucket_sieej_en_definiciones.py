from alembic import op
import sqlalchemy as sa


revision = 'c2d3e4f5a6b7'
down_revision = 'a0f1e2d3c4b5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text("""
            UPDATE sieej.formulario
            SET definicion = REPLACE(
                REPLACE(definicion::text, '"sieej-uploads"', '"sieej"'),
                '"sieej-diccionarios"', '"sieej"'
            )::json
            WHERE definicion::text LIKE '%sieej-uploads%'
               OR definicion::text LIKE '%sieej-diccionarios%'
        """)
    )

    op.execute(
        sa.text("""
            UPDATE sieej.envio_formulario
            SET definicion_snapshot = REPLACE(
                REPLACE(definicion_snapshot::text, '"sieej-uploads"', '"sieej"'),
                '"sieej-diccionarios"', '"sieej"'
            )::json
            WHERE definicion_snapshot::text LIKE '%sieej-uploads%'
               OR definicion_snapshot::text LIKE '%sieej-diccionarios%'
        """)
    )


def downgrade() -> None:
    pass
