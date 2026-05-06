"""normalize usuarios username/email a lowercase

Revision ID: b6c7d8e9f0a1
Revises: d7e8f9a0b1c2
Create Date: 2026-05-06 22:30:00.000000

"""
from alembic import op


revision = 'b6c7d8e9f0a1'
down_revision = 'd7e8f9a0b1c2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("UPDATE usuarios SET username = lower(trim(username)) WHERE username <> lower(trim(username));")
    op.execute("UPDATE usuarios SET email = lower(trim(email)) WHERE email <> lower(trim(email));")


def downgrade() -> None:
    pass
