"""add mapalab_api_keys_embeds

Revision ID: f6c7d8e9a0b1
Revises: d5e6f7a8b9c1
Create Date: 2026-05-12 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'f6c7d8e9a0b1'
down_revision = 'd5e6f7a8b9c1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'mapalab_api_keys_embeds',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('api_key_id', sa.Integer(), nullable=False),
        sa.Column('share_id', sa.String(length=10), nullable=False),
        sa.Column('label', sa.String(length=150), nullable=True),
        sa.Column('creado_por_user_id', sa.Integer(), nullable=True),
        sa.Column('creado_en', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(
            ['api_key_id'],
            ['mapalab_api_keys.id'],
            name='fk_mapalab_api_keys_embeds_api_key',
            ondelete='CASCADE',
        ),
        sa.ForeignKeyConstraint(
            ['creado_por_user_id'],
            ['usuarios.id'],
            name='fk_mapalab_api_keys_embeds_creado_por',
            ondelete='SET NULL',
        ),
        sa.UniqueConstraint('api_key_id', 'share_id', name='uq_mapalab_api_keys_embeds_key_share'),
    )
    op.create_index(
        'ix_mapalab_api_keys_embeds_api_key_id',
        'mapalab_api_keys_embeds',
        ['api_key_id'],
    )
    op.create_index(
        'ix_mapalab_api_keys_embeds_share_id',
        'mapalab_api_keys_embeds',
        ['share_id'],
    )


def downgrade() -> None:
    op.drop_index('ix_mapalab_api_keys_embeds_share_id', table_name='mapalab_api_keys_embeds')
    op.drop_index('ix_mapalab_api_keys_embeds_api_key_id', table_name='mapalab_api_keys_embeds')
    op.drop_table('mapalab_api_keys_embeds')
