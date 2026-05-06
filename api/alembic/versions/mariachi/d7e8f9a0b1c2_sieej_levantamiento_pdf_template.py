"""sieej-levantamiento: agrega pdfTemplate al step resumen

Revision ID: d7e8f9a0b1c2
Revises: c6d7e8f9ab01
Create Date: 2026-05-06 17:00:00.000000

UPDATE de la `definicion` JSONB del formulario `sieej-levantamiento`
para que el step `resumen` tenga `pdfTemplate: 'sieej-levantamiento'`.
El frontend usa esa flag para renderizar el PDF custom (con el
formato del wizard original) en lugar del PDF generico.

Idempotente: si la flag ya esta puesta, no hace nada.
"""
import json

import sqlalchemy as sa
from alembic import op


revision = 'd7e8f9a0b1c2'
down_revision = 'c6d7e8f9ab01'
branch_labels = None
depends_on = None

SCHEMA = "sieej"
SLUG = "sieej-levantamiento"


def upgrade() -> None:
    conn = op.get_bind()
    row = conn.execute(
        sa.text(f"SELECT id, definicion FROM {SCHEMA}.formulario WHERE slug = :slug").bindparams(slug=SLUG)
    ).first()
    if row is None:
        return  # idempotente: si no existe el seed, no hay nada que actualizar

    formulario_id, definicion = row
    if isinstance(definicion, str):
        definicion = json.loads(definicion)

    changed = False
    for step in definicion.get("steps", []):
        if step.get("type") == "summary":
            if step.get("pdfTemplate") != "sieej-levantamiento":
                step["pdfTemplate"] = "sieej-levantamiento"
                step["exportPdf"] = True
                changed = True

    if changed:
        conn.execute(
            sa.text(
                f"UPDATE {SCHEMA}.formulario SET definicion = CAST(:def_value AS json), actualizado_en = NOW() WHERE id = :id"
            ).bindparams(def_value=json.dumps(definicion), id=formulario_id)
        )


def downgrade() -> None:
    conn = op.get_bind()
    row = conn.execute(
        sa.text(f"SELECT id, definicion FROM {SCHEMA}.formulario WHERE slug = :slug").bindparams(slug=SLUG)
    ).first()
    if row is None:
        return

    formulario_id, definicion = row
    if isinstance(definicion, str):
        definicion = json.loads(definicion)

    for step in definicion.get("steps", []):
        if step.get("type") == "summary":
            step.pop("pdfTemplate", None)

    conn.execute(
        sa.text(
            f"UPDATE {SCHEMA}.formulario SET definicion = CAST(:def_value AS json), actualizado_en = NOW() WHERE id = :id"
        ).bindparams(def_value=json.dumps(definicion), id=formulario_id)
    )
