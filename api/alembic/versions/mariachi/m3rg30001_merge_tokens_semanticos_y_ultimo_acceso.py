"""merge tokens semanticos y ultimo acceso

Revision ID: m3rg30001
Revises: 1dent1dad0005, u1t1mo0001
Create Date: 2026-08-21 23:05:00.000000

Dos ramas partieron de s1eej0001: los tokens semanticos del modulo identidad y la columna
ultimo_acceso de usuarios. Ninguna toca lo que toca la otra, asi que el merge es vacio.

"""

revision = 'm3rg30001'
down_revision = ('1dent1dad0005', 'u1t1mo0001')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
