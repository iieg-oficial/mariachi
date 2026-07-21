"""move acervo tables to dedicated schema

Revision ID: c1a2b3c4d5e6
Revises: b7c8d9e0f1a2
Create Date: 2026-07-21 10:00:00.000000

Agrupa las tablas de acervo en un schema Postgres dedicado `acervo` (espejo del
schema `sieej`) y les quita el prefijo `acervo_` del nombre, ya que el schema las
namespacea:

  acervo_buckets  -> acervo.buckets
  acervo_files    -> acervo.files
  acervo_folders  -> acervo.folders

Es data-preserving: mueve y renombra las tablas existentes con ALTER (no recrea),
por lo que conserva filas, secuencias, indices y las FK que las referencian
(folders/files/reportes -> buckets), que Postgres reapunta automaticamente.
"""
from alembic import op

revision = 'c1a2b3c4d5e6'
down_revision = 'b7c8d9e0f1a2'
branch_labels = None
depends_on = None

SCHEMA = "acervo"

RENAMES = [
    ("acervo_buckets", "buckets"),
    ("acervo_files", "files"),
    ("acervo_folders", "folders"),
]


def upgrade() -> None:
    op.execute(f"CREATE SCHEMA IF NOT EXISTS {SCHEMA}")
    for old, _ in RENAMES:
        op.execute(f"ALTER TABLE {old} SET SCHEMA {SCHEMA}")
    for old, new in RENAMES:
        op.execute(f"ALTER TABLE {SCHEMA}.{old} RENAME TO {new}")
    op.execute(
        f"ALTER TABLE {SCHEMA}.folders "
        "RENAME CONSTRAINT uq_acervo_folders_bucket_path TO uq_folders_bucket_path"
    )


def downgrade() -> None:
    op.execute(
        f"ALTER TABLE {SCHEMA}.folders "
        "RENAME CONSTRAINT uq_folders_bucket_path TO uq_acervo_folders_bucket_path"
    )
    for old, new in RENAMES:
        op.execute(f"ALTER TABLE {SCHEMA}.{new} RENAME TO {old}")
    for old, _ in RENAMES:
        op.execute(f"ALTER TABLE {SCHEMA}.{old} SET SCHEMA public")
    op.execute(f"DROP SCHEMA IF EXISTS {SCHEMA}")
