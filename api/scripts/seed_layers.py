#!/usr/bin/env python3
"""Idempotent seed del arbol de capas MapaLab desde JSON.

Lee un archivo JSON con la forma:
    { "layers": [{ id, label, children, wmsConfig?, littleCard?, searchMeta?, ... }, ...],
      "initial_order": ["layer_id_1", "layer_id_2", ...] }

Aplica INSERT ... ON CONFLICT DO UPDATE contra mapalab.layers y mapalab.initial_layer_order.
Es idempotente: se puede correr N veces, solo persiste el ultimo estado.

Uso:
    # Dry-run (muestra lo que haria, no toca DB):
    python scripts/seed_layers.py --input /path/to/layers_export.json --dry-run

    # Aplicar:
    python scripts/seed_layers.py --input /path/to/layers_export.json --apply
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import delete, text  # noqa: E402
from sqlalchemy.dialects.postgresql import insert  # noqa: E402

from app.core.database import _ensure_dataengine_engine  # noqa: E402
import app.core.database as database  # noqa: E402
from app.models.layer import InitialLayerOrder, Layer, Workspace  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402


VALID_NODE_TYPES = {"tema", "category", "label", "group", "leaf"}


def infer_node_type(node: dict, depth: int) -> str:
    if depth == 0:
        return "tema"
    if node.get("isCategory"):
        return "category"
    if node.get("isLabel"):
        return "label"
    if node.get("forceGroup"):
        return "group"
    return "leaf"


def strip_leading_star(label: str) -> tuple[str, bool]:
    if label.startswith("*"):
        return label.lstrip("* ").strip(), True
    return label, False


def flatten_tree(
    nodes: list[dict],
    parent_id: str | None,
    depth: int,
    out: list[dict],
) -> None:
    for sort_order, node in enumerate(nodes):
        label_raw = node.get("label", "")
        label_clean, disabled = strip_leading_star(label_raw)
        node_type = infer_node_type(node, depth)

        if node_type not in VALID_NODE_TYPES:
            raise ValueError(f"node_type invalido '{node_type}' para id={node.get('id')}")

        row = {
            "id": node["id"],
            "parent_id": parent_id,
            "label": label_clean,
            "sort_order": sort_order,
            "node_type": node_type,
            "hidden_in_menu": bool(node.get("hiddenInMenu", False)),
            "disabled": disabled,
        }

        wms = node.get("wmsConfig") or {}
        row.update({
            "workspace_alias": wms.get("workspace") or None,
            "geoserver_layer": _extract_layer_name(wms),
            "styles": wms.get("styles", "") or "",
            "cql_filter": wms.get("cqlFilter", "") or "",
            "wms_group": wms.get("wmsGroup"),
            "wfs_available": bool(wms.get("wfsAvailable", True)),
            "wfs_layer_name": wms.get("wfsLayerName"),
            "downloadable": bool(node.get("downloadable", True)),
            "metadata_layer": wms.get("metadataLayer"),
            "time_enabled": bool(wms.get("timeEnabled", False)),
            "time_style_pattern": wms.get("timeStylePattern"),
        })

        row["default_date"] = node.get("defaultDate")
        row["raster_periodicity"] = node.get("rasterPeriodicity")
        row["hide_periodicity"] = bool(node.get("hidePeriodicity", False))
        row["default_zoom"] = node.get("defaultZoom")
        row["zoom_range"] = node.get("zoomRange")

        search_meta = node.get("searchMeta") or {}
        row["search_tags"] = search_meta.get("tags")
        row["searchable_fields"] = search_meta.get("searchableFields")
        row["has_municipio"] = bool(search_meta.get("hasMunicipio", False))
        row["has_direccion"] = bool(search_meta.get("hasDireccion", False))
        row["municipio_field"] = search_meta.get("municipioField")
        row["direccion_field"] = search_meta.get("direccionField")

        little_card = node.get("littleCard")
        if little_card and not isinstance(little_card, dict):
            raise ValueError(
                f"littleCard de {node['id']} no es dict (es {type(little_card).__name__}). "
                "Revisar el script de export."
            )
        row["infobox_template"] = None
        row["infobox_params"] = None
        row["infobox_config"] = little_card

        row["updated_by"] = "seed_layers.py"

        out.append(row)

        children = node.get("children") or []
        flatten_tree(children, node["id"], depth + 1, out)


def _extract_layer_name(wms: dict[str, Any]) -> str | None:
    """Extrae el nombre de la capa sin prefijo de workspace."""
    layer_name = wms.get("layerName")
    if layer_name and ":" in layer_name:
        return layer_name.split(":", 1)[1]
    return layer_name


def sort_rows_for_insert(rows: list[dict]) -> list[dict]:
    """Topological sort: padres antes que hijos (para FK self-ref)."""
    by_id = {r["id"]: r for r in rows}
    visited = set()
    order: list[dict] = []

    def visit(row_id: str, stack: set[str]) -> None:
        if row_id in visited:
            return
        if row_id in stack:
            raise ValueError(f"Ciclo detectado en id={row_id}")
        stack.add(row_id)
        row = by_id.get(row_id)
        if row is None:
            stack.remove(row_id)
            return
        if row["parent_id"]:
            visit(row["parent_id"], stack)
        visited.add(row_id)
        order.append(row)
        stack.remove(row_id)

    for r in rows:
        visit(r["id"], set())
    return order


def validate_workspaces(session: Session, rows: list[dict]) -> None:
    valid = {w.alias for w in session.query(Workspace).all()}
    missing = set()
    for r in rows:
        alias = r["workspace_alias"]
        if alias and alias not in valid:
            missing.add(alias)
    if missing:
        raise ValueError(
            f"Workspaces referenciados pero no existen en tabla workspaces: {sorted(missing)}. "
            f"Agregarlos al seed de la migracion."
        )


def upsert_rows(session: Session, rows: list[dict]) -> None:
    sorted_rows = sort_rows_for_insert(rows)
    keys = [k for k in sorted_rows[0].keys() if k != "id"]
    stmt = insert(Layer).values(sorted_rows)
    update_cols = {k: getattr(stmt.excluded, k) for k in keys}
    update_cols["updated_at"] = text("NOW()")
    stmt = stmt.on_conflict_do_update(index_elements=["id"], set_=update_cols)
    session.execute(stmt)


def prune_missing(session: Session, valid_ids: set[str]) -> int:
    existing = {row[0] for row in session.query(Layer.id).all()}
    to_delete = existing - valid_ids
    if not to_delete:
        return 0
    session.execute(delete(Layer).where(Layer.id.in_(to_delete)))
    return len(to_delete)


def upsert_initial_order(session: Session, ids: list[str]) -> None:
    session.execute(delete(InitialLayerOrder))
    for sort_order, layer_id in enumerate(ids):
        session.add(InitialLayerOrder(layer_id=layer_id, sort_order=sort_order))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path, help="Path al JSON exportado por export_layers_to_json.mjs")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--prune", action="store_true", help="Elimina capas en DB que no estan en el JSON")
    args = parser.parse_args()

    if not args.dry_run and not args.apply:
        print("ERROR: usa --dry-run o --apply", file=sys.stderr)
        return 1

    if not args.input.exists():
        print(f"ERROR: archivo no encontrado: {args.input}", file=sys.stderr)
        return 1

    data = json.loads(args.input.read_text())
    trees = data.get("layers") or []
    initial_order = data.get("initial_order") or []

    flat: list[dict] = []
    flatten_tree(trees, None, 0, flat)

    print(f"[seed] temas: {len(trees)}")
    print(f"[seed] total filas: {len(flat)}")
    print(f"[seed] initial_order: {len(initial_order)} capas")
    print(f"[seed] por node_type: ", end="")
    counts: dict[str, int] = {}
    for r in flat:
        counts[r["node_type"]] = counts.get(r["node_type"], 0) + 1
    print(counts)

    _ensure_dataengine_engine()

    with Session(database.dataengine_engine) as session:
        validate_workspaces(session, flat)
        valid_ids = {r["id"] for r in flat}

        if args.dry_run:
            print("[seed] DRY-RUN (no escribe en DB). Usa --apply para persistir.")
            return 0

        upsert_rows(session, flat)

        pruned = 0
        if args.prune:
            pruned = prune_missing(session, valid_ids)
            print(f"[seed] pruned: {pruned} capas no presentes en JSON eliminadas")

        upsert_initial_order(session, initial_order)

        session.commit()
        print(f"[seed] OK — {len(flat)} capas upsert, pruned={pruned}, initial_order={len(initial_order)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
