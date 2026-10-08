"""merge eventos lite y breakpoints de mel

Revision ID: m3rg30002
Revises: m3lbp0001, 3v3ntl1t30001
Create Date: 2026-09-10 00:00:00.000000

Eventos lite llega de tamal-verde colgado de c1f2e3d4a5b6, que en tamal-rojo ya tiene descendientes
hasta m3lbp0001. Ninguna rama toca lo que toca la otra, asi que el merge es vacio.

"""

revision = 'm3rg30002'
down_revision = ('m3lbp0001', '3v3ntl1t30001')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
