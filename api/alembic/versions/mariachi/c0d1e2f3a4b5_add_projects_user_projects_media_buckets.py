"""add projects, user_projects, media_buckets

Revision ID: c0d1e2f3a4b5
Revises: b5c6d7e8f9a0
Create Date: 2026-04-24 20:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'c0d1e2f3a4b5'
down_revision = 'b5c6d7e8f9a0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'projects',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('slug', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('slug', name='uq_projects_slug'),
    )
    op.create_index('ix_projects_slug', 'projects', ['slug'], unique=True)

    op.create_table(
        'user_projects',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column(
            'project_role',
            sa.Enum('editor', 'viewer', name='project_roles'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(['user_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id', 'project_id'),
    )

    op.create_table(
        'media_buckets',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('acervo_bucket', sa.String(length=100), nullable=False),
        sa.Column('access_key_ref', sa.String(length=100), nullable=False),
        sa.Column('display_name', sa.String(length=200), nullable=False),
        sa.Column('is_public', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('acervo_bucket', name='uq_media_buckets_acervo_bucket'),
    )
    op.create_index('ix_media_buckets_project_id', 'media_buckets', ['project_id'], unique=False)

    # Seeds: proyectos + buckets
    conn = op.get_bind()
    conn.execute(
        sa.text("""
            INSERT INTO projects (slug, name, description, is_active, created_at) VALUES
                ('portal',  'Portalito',       'Sitio público del IIEG',              true, NOW()),
                ('mapalab', 'MapaLab',         'Visor de capas geoespaciales',        true, NOW()),
                ('sieej',   'SIEEJ',           'Sistema de información estadística',  true, NOW())
        """)
    )
    conn.execute(
        sa.text("""
            INSERT INTO media_buckets (project_id, acervo_bucket, access_key_ref, display_name, is_public, is_active, created_at)
            SELECT p.id, b.acervo_bucket, b.access_key_ref, b.display_name, b.is_public, true, NOW()
            FROM (VALUES
                ('portal',  'portal',     'ACERVO_PORTAL',     'Assets del Portal',         true),
                ('mapalab', 'mapalab',    'ACERVO_MAPALAB',    'Metadatos de capas',        true),
                ('mapalab', 'dateengine', 'ACERVO_DATEENGINE', 'Datos geoespaciales',       false)
            ) AS b(project_slug, acervo_bucket, access_key_ref, display_name, is_public)
            JOIN projects p ON p.slug = b.project_slug
        """)
    )

    # Backfill: cada usuario editora existente → membership editor en portal y mapalab
    # (admins no necesitan fila — tienen acceso a todo por rol global)
    conn.execute(
        sa.text("""
            INSERT INTO user_projects (user_id, project_id, project_role)
            SELECT u.id, p.id, 'editor'
            FROM usuarios u
            CROSS JOIN projects p
            WHERE u.role = 'editora'
              AND p.slug IN ('portal', 'mapalab')
            ON CONFLICT DO NOTHING
        """)
    )


def downgrade() -> None:
    op.drop_index('ix_media_buckets_project_id', table_name='media_buckets')
    op.drop_table('media_buckets')
    op.drop_table('user_projects')
    op.execute('DROP TYPE IF EXISTS project_roles')
    op.drop_index('ix_projects_slug', table_name='projects')
    op.drop_table('projects')
