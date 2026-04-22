"""Initial migration

Revision ID: 001
Revises:
Create Date: 2024-11-04

"""
from alembic import op
import sqlalchemy as sa


revision = '001'
down_revision = None
branch_labels = ('mariachi',)
depends_on = None


def upgrade() -> None:
    op.create_table(
        'usuarios',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('role', sa.Enum('tetlamamakani', 'editora', 'diseñadora', name='user_roles'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_usuarios_id'), 'usuarios', ['id'], unique=False)
    op.create_index(op.f('ix_usuarios_username'), 'usuarios', ['username'], unique=True)
    op.create_index(op.f('ix_usuarios_email'), 'usuarios', ['email'], unique=True)

    op.create_table(
        'menu_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('label', sa.String(), nullable=False),
        sa.Column('url', sa.String(), nullable=False),
        sa.Column('order', sa.Integer(), nullable=True),
        sa.Column('visible', sa.Boolean(), nullable=True),
        sa.Column('external', sa.Boolean(), nullable=True),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('icon', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_menu_items_id'), 'menu_items', ['id'], unique=False)

    op.create_table(
        'pages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('menu_item_id', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('slug', sa.String(), nullable=False),
        sa.Column('sections', sa.JSON(), nullable=False),
        sa.Column('meta_description', sa.Text(), nullable=True),
        sa.Column('meta_keywords', sa.String(), nullable=True),
        sa.Column('published_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_pages_id'), 'pages', ['id'], unique=False)
    op.create_index(op.f('ix_pages_menu_item_id'), 'pages', ['menu_item_id'], unique=True)

    op.create_table(
        'media_folders',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('path', sa.String(), nullable=False),
        sa.Column('parent', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_media_folders_id'), 'media_folders', ['id'], unique=False)
    op.create_index(op.f('ix_media_folders_path'), 'media_folders', ['path'], unique=True)

    op.create_table(
        'layouts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('config', sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_layouts_id'), 'layouts', ['id'], unique=False)
    op.create_index(op.f('ix_layouts_type'), 'layouts', ['type'], unique=True)

    op.create_table(
        'icons',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('svg', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_icons_id'), 'icons', ['id'], unique=False)
    op.create_index(op.f('ix_icons_name'), 'icons', ['name'], unique=True)

    op.create_table(
        'styles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('key', sa.String(), nullable=False),
        sa.Column('config', sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_styles_id'), 'styles', ['id'], unique=False)
    op.create_index(op.f('ix_styles_key'), 'styles', ['key'], unique=True)

    op.create_table(
        'media',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('original_name', sa.String(), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('size', sa.Integer(), nullable=False),
        sa.Column('url', sa.String(), nullable=False),
        sa.Column('thumbnail', sa.String(), nullable=True),
        sa.Column('folder', sa.String(), nullable=False),
        sa.Column('uploaded_by', sa.Integer(), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(), nullable=False),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['uploaded_by'], ['usuarios.id'], ),
        sa.ForeignKeyConstraint(['folder'], ['media_folders.path'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_media_id'), 'media', ['id'], unique=False)
    op.create_index(op.f('ix_media_name'), 'media', ['name'], unique=False)
    op.create_index(op.f('ix_media_folder'), 'media', ['folder'], unique=False)

    op.create_table(
        'history_entries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('resource', sa.String(), nullable=False),
        sa.Column('resource_id', sa.String(), nullable=True),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['usuarios.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_history_entries_id'), 'history_entries', ['id'], unique=False)
    op.create_index(op.f('ix_history_entries_user_id'), 'history_entries', ['user_id'], unique=False)
    op.create_index(op.f('ix_history_entries_action'), 'history_entries', ['action'], unique=False)
    op.create_index(op.f('ix_history_entries_resource'), 'history_entries', ['resource'], unique=False)
    op.create_index(op.f('ix_history_entries_timestamp'), 'history_entries', ['timestamp'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_history_entries_timestamp'), table_name='history_entries')
    op.drop_index(op.f('ix_history_entries_resource'), table_name='history_entries')
    op.drop_index(op.f('ix_history_entries_action'), table_name='history_entries')
    op.drop_index(op.f('ix_history_entries_user_id'), table_name='history_entries')
    op.drop_index(op.f('ix_history_entries_id'), table_name='history_entries')
    op.drop_table('history_entries')

    op.drop_index(op.f('ix_media_folder'), table_name='media')
    op.drop_index(op.f('ix_media_name'), table_name='media')
    op.drop_index(op.f('ix_media_id'), table_name='media')
    op.drop_table('media')

    op.drop_index(op.f('ix_styles_key'), table_name='styles')
    op.drop_index(op.f('ix_styles_id'), table_name='styles')
    op.drop_table('styles')

    op.drop_index(op.f('ix_icons_name'), table_name='icons')
    op.drop_index(op.f('ix_icons_id'), table_name='icons')
    op.drop_table('icons')

    op.drop_index(op.f('ix_layouts_type'), table_name='layouts')
    op.drop_index(op.f('ix_layouts_id'), table_name='layouts')
    op.drop_table('layouts')

    op.drop_index(op.f('ix_media_folders_path'), table_name='media_folders')
    op.drop_index(op.f('ix_media_folders_id'), table_name='media_folders')
    op.drop_table('media_folders')

    op.drop_index(op.f('ix_pages_menu_item_id'), table_name='pages')
    op.drop_index(op.f('ix_pages_id'), table_name='pages')
    op.drop_table('pages')

    op.drop_index(op.f('ix_menu_items_id'), table_name='menu_items')
    op.drop_table('menu_items')

    op.drop_index(op.f('ix_usuarios_email'), table_name='usuarios')
    op.drop_index(op.f('ix_usuarios_username'), table_name='usuarios')
    op.drop_index(op.f('ix_usuarios_id'), table_name='usuarios')
    op.drop_table('usuarios')
