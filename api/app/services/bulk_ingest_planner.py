from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Connection

from app.services.bulk_ingest_parser import parse_date_iso, parse_number_with_symbol

METADATA_SCALAR_COLUMNS = (
    'workspace',
    'layer_name_db',
    'layer_name_usuario',
    'descripcion',
    'frecuencia',
    'fecha_ultima',
    'tipo_mapa',
    'tipo_mapa_enlace',
    'texto_leyenda',
    'tarjeta_punto_poligono',
    'link_final_capa',
)
METADATA_JSONB_COLUMNS = ('fuentes', 'metodologia', 'metadato')
METADATA_BOOL_COLUMNS = ('downloadable',)
METADATA_PK = 'layer_key'

STATS_SCALAR_COLUMNS = ('pie_numeralia',)
STATS_JSONB_COLUMNS = ('values',)

METADATA_MERGEABLE = (
    *METADATA_SCALAR_COLUMNS,
    *METADATA_JSONB_COLUMNS,
    *METADATA_BOOL_COLUMNS,
)
STATS_MERGEABLE = (*STATS_SCALAR_COLUMNS, *STATS_JSONB_COLUMNS)


def _canon_numeralia_item(item: Any) -> Any:
    if not isinstance(item, dict):
        return item
    out: dict = {}
    for k, v in item.items():
        if v is None or v == '':
            continue
        if k == 'valor':
            num, _ = parse_number_with_symbol(v)
            out[k] = num if num is not None else v
        else:
            out[k] = v
    return out


def _normalize_for_compare(col: str, value: Any) -> Any:
    """Normaliza un valor a forma canonica para comparar contra otro.

    El proposito es que dos valores que representan lo mismo semanticamente
    pero con formato distinto (`'31/12/2023'` vs `'2023-12-31'`, `'1,234.50'`
    vs `'1234.50'`) se consideren iguales y no marquen diff espurio en el
    plan. Solo afecta la comparacion; lo que se persiste sigue siendo lo que
    produjo el parser (ya normalizado al estandar IIEG).
    """
    if value is None:
        return None
    if col == 'fecha_ultima':
        return parse_date_iso(value)
    if col == 'values' and isinstance(value, list):
        return json.dumps([_canon_numeralia_item(it) for it in value], sort_keys=True, ensure_ascii=False)
    if isinstance(value, (dict, list)):
        return json.dumps(value, sort_keys=True, ensure_ascii=False)
    return value


def _coerce(col: str, value: Any) -> Any:
    if col in METADATA_JSONB_COLUMNS or col in STATS_JSONB_COLUMNS:
        return None if value is None else json.dumps(value, ensure_ascii=False)
    return value


def _placeholder(col: str, prefix: str = '') -> str:
    name = f'{prefix}{col}'
    if col in METADATA_JSONB_COLUMNS or col in STATS_JSONB_COLUMNS:
        return f'CAST(:{name} AS jsonb)'
    return f':{name}'


def _fetch_existing_metadata(conn: Connection, layer_keys: list[str]) -> dict[str, dict]:
    if not layer_keys:
        return {}
    cols = ', '.join((METADATA_PK, *METADATA_MERGEABLE))
    result = conn.execute(
        text(
            f'SELECT {cols} FROM mapalab.layer_metadata '
            f'WHERE {METADATA_PK} = ANY(:keys)'
        ),
        {'keys': layer_keys},
    ).mappings().all()
    return {row[METADATA_PK]: dict(row) for row in result}


def _fetch_existing_stats(conn: Connection, layer_keys: list[str]) -> dict[str, dict]:
    if not layer_keys:
        return {}
    result = conn.execute(
        text(
            'SELECT layer_key, values, pie_numeralia FROM mapalab.layer_stats '
            'WHERE layer_key = ANY(:keys)'
        ),
        {'keys': layer_keys},
    ).mappings().all()
    return {row['layer_key']: dict(row) for row in result}


def build_plan(
    conn: Connection,
    dependencia: str,
    source_filename: str,
    rows: list[dict],
) -> dict:
    normalized: list[dict] = []
    seen: set[str] = set()
    duplicates: list[str] = []
    missing_pk_samples: list[dict[str, Any]] = []
    missing_pk_count = 0

    for raw in rows:
        key = (raw.get(METADATA_PK) or '').strip()
        if not key:
            missing_pk_count += 1
            if len(missing_pk_samples) < 5:
                missing_pk_samples.append({k: v for k, v in raw.items() if v not in (None, '')})
            continue
        if key in seen:
            duplicates.append(key)
            continue
        seen.add(key)
        normalized.append({**raw, METADATA_PK: key})

    existing_meta = _fetch_existing_metadata(conn, list(seen))
    existing_stats = _fetch_existing_stats(conn, list(seen))

    changes: list[dict] = []
    inserts_meta = 0
    updates_meta = 0
    inserts_stats = 0
    updates_stats = 0

    for row in normalized:
        key = row[METADATA_PK]
        current_meta = existing_meta.get(key)
        current_stats = existing_stats.get(key)

        meta_values = {
            col: row.get(col)
            for col in METADATA_MERGEABLE
            if row.get(col) is not None
        }
        stats_values_raw = {
            col: row.get(col)
            for col in STATS_MERGEABLE
            if row.get(col) is not None
        }

        diffs: list[dict] = []

        if current_meta is None:
            op = 'insert'
            inserts_meta += 1
        else:
            op = 'update'
            for col, new_val in meta_values.items():
                old_val = current_meta.get(col)
                if _normalize_for_compare(col, new_val) == _normalize_for_compare(col, old_val):
                    continue
                diffs.append({
                    'column': col,
                    'table': 'layer_metadata',
                    'from_value': old_val,
                    'to_value': new_val,
                    'apply': True,
                })
            if diffs:
                updates_meta += 1

        if stats_values_raw:
            if current_stats is None:
                inserts_stats += 1
            else:
                stats_diffs: list[dict] = []
                for col, new_val in stats_values_raw.items():
                    old_val = current_stats.get(col)
                    if _normalize_for_compare(col, new_val) == _normalize_for_compare(col, old_val):
                        continue
                    stats_diffs.append({
                        'column': col,
                        'table': 'layer_stats',
                        'from_value': old_val,
                        'to_value': new_val,
                        'apply': True,
                    })
                if stats_diffs:
                    diffs.extend(stats_diffs)
                    updates_stats += 1

        if op == 'insert' or diffs:
            changes.append({
                'layer_key': key,
                'op': op,
                'metadata_values': meta_values if op == 'insert' else None,
                'stats_values': stats_values_raw if op == 'insert' and stats_values_raw else None,
                'diffs': diffs,
                'apply': True,
            })

    return {
        'version': 1,
        'dependencia': dependencia,
        'source_filename': source_filename,
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'stats': {
            'rows_in_source': len(rows),
            'rows_with_pk': len(normalized) + len(duplicates),
            'rows_unique': len(normalized),
            'rows_missing_pk': missing_pk_count,
            'rows_duplicate_pk': len(duplicates),
            'inserts': inserts_meta,
            'updates': updates_meta,
            'stats_inserts': inserts_stats,
            'stats_updates': updates_stats,
        },
        'duplicates_skipped': duplicates,
        'rows_missing_pk_samples': missing_pk_samples,
        'changes': changes,
    }


def _apply_metadata_insert(
    conn: Connection, change: dict, dependencia: str, updated_by: str
) -> str:
    values = dict(change.get('metadata_values') or {})
    values[METADATA_PK] = change['layer_key']
    values['workspace'] = values.get('workspace') or (
        change['layer_key'].split(':', 1)[0] if ':' in change['layer_key'] else None
    )
    values['updated_by'] = updated_by

    cols = list(values.keys())
    placeholders = ', '.join(_placeholder(c) if c != 'updated_by' else ':updated_by' for c in cols)
    col_list = ', '.join(cols)
    payload = {c: _coerce(c, v) for c, v in values.items()}

    sql = text(
        f'INSERT INTO mapalab.layer_metadata ({col_list}) VALUES ({placeholders}) '
        f'ON CONFLICT ({METADATA_PK}) DO NOTHING'
    )
    result = conn.execute(sql, payload)
    return 'inserted' if (result.rowcount or 0) > 0 else 'conflict'


def _apply_metadata_update(
    conn: Connection, layer_key: str, approved: list[dict], updated_by: str
) -> tuple[int, int]:
    if not approved:
        return (0, 0)

    set_clauses = []
    where_clauses = [f'{METADATA_PK} = :_pk']
    payload: dict[str, Any] = {'_pk': layer_key, 'updated_by': updated_by}

    for d in approved:
        col = d['column']
        set_clauses.append(f'{col} = {_placeholder(col)}')
        payload[col] = _coerce(col, d['to_value'])
        where_clauses.append(f'{col} IS NOT DISTINCT FROM {_placeholder(col, "_expected_")}')
        payload[f'_expected_{col}'] = _coerce(col, d['from_value'])

    set_clauses.append('updated_by = :updated_by')
    set_clauses.append('updated_at = NOW()')

    sql = text(
        'UPDATE mapalab.layer_metadata SET '
        + ', '.join(set_clauses)
        + ' WHERE '
        + ' AND '.join(where_clauses)
    )
    result = conn.execute(sql, payload)
    return (len(approved), result.rowcount or 0)


def _apply_stats_upsert(
    conn: Connection, layer_key: str, approved: list[dict]
) -> tuple[int, int, bool]:
    if not approved:
        return (0, 0, False)

    existing = conn.execute(
        text('SELECT layer_key, values, pie_numeralia FROM mapalab.layer_stats WHERE layer_key = :k'),
        {'k': layer_key},
    ).mappings().first()

    if existing is None:
        cols = ['layer_key']
        placeholders = [':layer_key']
        payload: dict[str, Any] = {'layer_key': layer_key}
        for d in approved:
            col = d['column']
            cols.append(col)
            placeholders.append(_placeholder(col))
            payload[col] = _coerce(col, d['to_value'])
        sql = text(
            f'INSERT INTO mapalab.layer_stats ({", ".join(cols)}) '
            f'VALUES ({", ".join(placeholders)}) ON CONFLICT (layer_key) DO NOTHING'
        )
        result = conn.execute(sql, payload)
        return (len(approved), result.rowcount or 0, True)

    set_clauses = []
    where_clauses = ['layer_key = :_pk']
    payload = {'_pk': layer_key}
    for d in approved:
        col = d['column']
        set_clauses.append(f'{col} = {_placeholder(col)}')
        payload[col] = _coerce(col, d['to_value'])
        where_clauses.append(f'{col} IS NOT DISTINCT FROM {_placeholder(col, "_expected_")}')
        payload[f'_expected_{col}'] = _coerce(col, d['from_value'])

    sql = text(
        'UPDATE mapalab.layer_stats SET '
        + ', '.join(set_clauses)
        + ' WHERE '
        + ' AND '.join(where_clauses)
    )
    result = conn.execute(sql, payload)
    return (len(approved), result.rowcount or 0, False)


def apply_plan(
    conn: Connection,
    plan: dict,
    dependencia: str,
    updated_by: str,
    selection: set[str] | None = None,
) -> dict:
    metadata_inserts = 0
    metadata_updates = 0
    stats_inserts = 0
    stats_updates = 0
    skipped = 0
    conflicts: list[str] = []

    for change in plan.get('changes', []):
        key = change['layer_key']
        if selection is not None and key not in selection:
            skipped += 1
            continue
        if not change.get('apply', True):
            skipped += 1
            continue

        if change['op'] == 'insert':
            status = _apply_metadata_insert(conn, change, dependencia, updated_by)
            if status == 'inserted':
                metadata_inserts += 1
            else:
                conflicts.append(key)
                continue

            stats_diffs = [d for d in change.get('diffs', []) if d['table'] == 'layer_stats']
            init_stats: list[dict] = []
            for col, val in (change.get('stats_values') or {}).items():
                init_stats.append({'column': col, 'table': 'layer_stats', 'from_value': None, 'to_value': val, 'apply': True})
            stats_diffs = init_stats or stats_diffs
            approved_stats = [d for d in stats_diffs if d.get('apply', True)]
            if approved_stats:
                _, affected, was_insert = _apply_stats_upsert(conn, key, approved_stats)
                if affected > 0:
                    if was_insert:
                        stats_inserts += 1
                    else:
                        stats_updates += 1
                else:
                    conflicts.append(f'{key}:stats')
        else:
            meta_diffs = [
                d for d in change.get('diffs', [])
                if d['table'] == 'layer_metadata' and d.get('apply', True)
            ]
            stats_diffs = [
                d for d in change.get('diffs', [])
                if d['table'] == 'layer_stats' and d.get('apply', True)
            ]

            if meta_diffs:
                _, affected = _apply_metadata_update(conn, key, meta_diffs, updated_by)
                if affected > 0:
                    metadata_updates += 1
                else:
                    conflicts.append(key)
            if stats_diffs:
                _, affected, was_insert = _apply_stats_upsert(conn, key, stats_diffs)
                if affected > 0:
                    if was_insert:
                        stats_inserts += 1
                    else:
                        stats_updates += 1
                else:
                    conflicts.append(f'{key}:stats')

            if not meta_diffs and not stats_diffs:
                skipped += 1

    return {
        'metadata_inserts': metadata_inserts,
        'metadata_updates': metadata_updates,
        'stats_inserts': stats_inserts,
        'stats_updates': stats_updates,
        'skipped': skipped,
        'conflicts': conflicts,
    }
