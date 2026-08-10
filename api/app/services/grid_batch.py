from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Callable

from sqlalchemy import text
from sqlalchemy.engine import Connection

MAX_CHANGES_PER_REQUEST = 500


class GridBatchError(ValueError):
    pass


@dataclass(frozen=True)
class GridTable:
    key: str
    qualified_name: str
    primary_key: str
    columns: tuple[str, ...]
    jsonb_columns: tuple[str, ...] = ()
    array_columns: tuple[str, ...] = ()
    audit_user_column: str | None = None
    audit_timestamp_column: str | None = None
    allow_insert: bool = False


@dataclass(frozen=True)
class GridField:
    key: str
    table: str
    columns: tuple[str, ...]
    read: Callable[[dict], Any]
    write: Callable[[dict, Any], None]
    coerce: Callable[[Any], Any] | None = None
    editable: bool = True
    max_length: int | None = None


@dataclass(frozen=True)
class GridSpec:
    key: str
    database: str
    row_key_field: str
    tables: dict[str, GridTable]
    fields: dict[str, GridField]
    fetch_rows: Callable[..., list[dict]]
    presence_scope: str
    permission: str | None = None
    columns_meta: list[dict] = field(default_factory=list)
    guard: Callable[[Connection, dict[str, dict], GridField, Any], str | None] | None = None
    history_table: str | None = None
    on_commit: Callable[[], None] | None = None


@dataclass(frozen=True)
class CellChange:
    row_key: str
    column: str
    from_value: Any
    to_value: Any


def normalize_blank(value: Any) -> Any:
    if isinstance(value, str) and not value.strip():
        return None
    return value


def values_match(left: Any, right: Any) -> bool:
    left = normalize_blank(left)
    right = normalize_blank(right)
    if left is None and right is None:
        return True
    if isinstance(left, (dict, list)) or isinstance(right, (dict, list)):
        return json.dumps(left, sort_keys=True, ensure_ascii=False) == json.dumps(
            right, sort_keys=True, ensure_ascii=False
        )
    if isinstance(left, bool) or isinstance(right, bool):
        return bool(left) == bool(right)
    if left is None or right is None:
        return False
    return str(left) == str(right)


def json_list_item_field(column: str, index: int, key: str) -> tuple[Callable, Callable]:

    def _as_list(raw: Any) -> list:
        if raw is None:
            return []
        if isinstance(raw, dict):
            return [raw]
        if isinstance(raw, list):
            return [it for it in raw if isinstance(it, dict)]
        return []

    def read(row: dict) -> Any:
        items = _as_list(row.get(column))
        if index >= len(items):
            return None
        return normalize_blank(items[index].get(key))

    def write(row: dict, value: Any) -> None:
        items = _as_list(row.get(column))
        while len(items) <= index:
            items.append({})
        item = dict(items[index])
        if value is None:
            item.pop(key, None)
        else:
            item[key] = value
        items[index] = item
        cleaned = [it for it in items if any(v not in (None, '') for v in it.values())]
        row[column] = cleaned or None

    return read, write


def json_slot_field(
    column: str, match_key: str, match_value: Any, value_key: str
) -> tuple[Callable, Callable]:

    def _as_list(raw: Any) -> list:
        if isinstance(raw, list):
            return [it for it in raw if isinstance(it, dict)]
        return []

    def read(row: dict) -> Any:
        for item in _as_list(row.get(column)):
            if item.get(match_key) == match_value:
                return normalize_blank(item.get(value_key))
        return None

    def write(row: dict, value: Any) -> None:
        items = [dict(it) for it in _as_list(row.get(column))]
        target = next((it for it in items if it.get(match_key) == match_value), None)
        if target is None:
            if value is None:
                return
            target = {match_key: match_value}
            items.append(target)
        if value is None:
            target.pop(value_key, None)
        else:
            target[value_key] = value
        items = [
            it for it in items
            if any(k != match_key and v not in (None, '') for k, v in it.items())
        ]
        items.sort(key=lambda it: it.get(match_key) or 0)
        row[column] = items

    return read, write


def history_text(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return 'true' if value else 'false'
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False)
    text_value = str(value)
    return text_value if text_value.strip() else None


def record_cell_history(
    conn: Connection,
    spec: GridSpec,
    entries: list[dict],
    changed_by: str | None,
    source: str = 'grid',
) -> int:
    if not spec.history_table or not entries:
        return 0

    payload = [
        {
            'resource': spec.key,
            'row_key': entry['row_key'],
            'column_key': entry['column'],
            'from_value': history_text(entry.get('from_value')),
            'to_value': history_text(entry.get('to_value')),
            'changed_by': changed_by,
            'source': source,
        }
        for entry in entries
    ]
    conn.execute(
        text(
            f'INSERT INTO {spec.history_table} '
            '(resource, row_key, column_key, from_value, to_value, changed_by, source) '
            'VALUES (:resource, :row_key, :column_key, :from_value, :to_value, :changed_by, :source)'
        ),
        payload,
    )
    return len(payload)


def diff_states(
    spec: GridSpec,
    row_key: str,
    before: dict[str, dict],
    after: dict[str, dict],
) -> list[dict]:
    entries: list[dict] = []
    for key, grid_field in spec.fields.items():
        before_state = before.get(grid_field.table)
        after_state = after.get(grid_field.table)
        if before_state is None and after_state is None:
            continue
        old_value = grid_field.read(before_state) if before_state is not None else None
        new_value = grid_field.read(after_state) if after_state is not None else None
        if values_match(old_value, new_value):
            continue
        entries.append({
            'row_key': row_key,
            'column': key,
            'from_value': old_value,
            'to_value': new_value,
        })
    return entries


def array_literal(value: Any) -> str | None:
    if value is None:
        return None
    items = value if isinstance(value, (list, tuple)) else [value]
    parts = []
    for item in items:
        escaped = str(item).replace('\\', '\\\\').replace('"', '\\"')
        parts.append(f'"{escaped}"')
    return '{' + ','.join(parts) + '}'


def _coerce_for_sql(table: GridTable, column: str, value: Any) -> Any:
    if column in table.jsonb_columns:
        return None if value is None else json.dumps(value, ensure_ascii=False)
    if column in table.array_columns:
        return array_literal(value)
    return value


def _placeholder(table: GridTable, column: str, name: str) -> str:
    if column in table.jsonb_columns:
        return f'CAST(:{name} AS jsonb)'
    if column in table.array_columns:
        return f'CAST(:{name} AS text[])'
    return f':{name}'


def _fetch_locked_row(conn: Connection, table: GridTable, row_key: str) -> dict | None:
    cols = ', '.join(table.columns)
    row = conn.execute(
        text(
            f'SELECT {cols} FROM {table.qualified_name} '
            f'WHERE {table.primary_key} = :row_key FOR UPDATE'
        ),
        {'row_key': row_key},
    ).mappings().first()
    return dict(row) if row else None


def _write_table(
    conn: Connection,
    table: GridTable,
    row_key: str,
    state: dict,
    touched: set[str],
    row_existed: bool,
    updated_by: str | None,
) -> int:
    if not touched:
        return 0

    payload: dict[str, Any] = {'row_key': row_key}
    for column in touched:
        payload[column] = _coerce_for_sql(table, column, state.get(column))

    if row_existed:
        assignments = [f'{c} = {_placeholder(table, c, c)}' for c in sorted(touched)]
        if table.audit_user_column and updated_by:
            assignments.append(f'{table.audit_user_column} = :updated_by')
            payload['updated_by'] = updated_by
        if table.audit_timestamp_column:
            assignments.append(f'{table.audit_timestamp_column} = NOW()')
        sql = text(
            f'UPDATE {table.qualified_name} SET {", ".join(assignments)} '
            f'WHERE {table.primary_key} = :row_key'
        )
        return conn.execute(sql, payload).rowcount or 0

    columns = [table.primary_key, *sorted(touched)]
    placeholders = [':row_key', *[_placeholder(table, c, c) for c in sorted(touched)]]
    if table.audit_user_column and updated_by:
        columns.append(table.audit_user_column)
        placeholders.append(':updated_by')
        payload['updated_by'] = updated_by
    sql = text(
        f'INSERT INTO {table.qualified_name} ({", ".join(columns)}) '
        f'VALUES ({", ".join(placeholders)}) '
        f'ON CONFLICT ({table.primary_key}) DO NOTHING'
    )
    return conn.execute(sql, payload).rowcount or 0


def _validate_change(spec: GridSpec, change: CellChange) -> GridField:
    grid_field = spec.fields.get(change.column)
    if grid_field is None:
        raise GridBatchError(f"Columna '{change.column}' no existe en '{spec.key}'")
    if not grid_field.editable:
        raise GridBatchError(f"Columna '{change.column}' es de solo lectura")
    return grid_field


def _prepare_value(grid_field: GridField, raw: Any) -> Any:
    value = normalize_blank(raw)
    if value is not None and grid_field.coerce is not None:
        value = grid_field.coerce(value)
    value = normalize_blank(value)
    if (
        value is not None
        and grid_field.max_length is not None
        and isinstance(value, str)
        and len(value) > grid_field.max_length
    ):
        raise GridBatchError(
            f"'{grid_field.key}' excede el maximo de {grid_field.max_length} caracteres"
        )
    return value


def apply_cell_changes(
    conn: Connection,
    spec: GridSpec,
    changes: list[CellChange],
    updated_by: str | None,
) -> dict:
    if len(changes) > MAX_CHANGES_PER_REQUEST:
        raise GridBatchError(
            f'Demasiados cambios en una sola peticion (max {MAX_CHANGES_PER_REQUEST})'
        )

    grouped: dict[str, list[CellChange]] = {}
    for change in changes:
        _validate_change(spec, change)
        grouped.setdefault(change.row_key, []).append(change)

    applied = 0
    conflicts: list[dict] = []
    rejected: list[dict] = []
    rows_touched: set[str] = set()
    history_entries: list[dict] = []

    for row_key, row_changes in grouped.items():
        table_keys = {spec.fields[c.column].table for c in row_changes}
        states: dict[str, dict] = {}
        existed: dict[str, bool] = {}
        missing_tables: set[str] = set()

        for table_key in table_keys:
            table = spec.tables[table_key]
            current = _fetch_locked_row(conn, table, row_key)
            if current is None:
                if not table.allow_insert:
                    missing_tables.add(table_key)
                    continue
                current = {column: None for column in table.columns}
                existed[table_key] = False
            else:
                existed[table_key] = True
            states[table_key] = current

        touched: dict[str, set[str]] = {key: set() for key in states}

        for change in row_changes:
            grid_field = spec.fields[change.column]
            if grid_field.table in missing_tables:
                conflicts.append({
                    'rowKey': row_key,
                    'column': change.column,
                    'reason': 'row_missing',
                })
                continue

            if spec.guard is not None:
                blocked = spec.guard(conn, states, grid_field, change.to_value)
                if blocked:
                    rejected.append({
                        'rowKey': row_key,
                        'column': change.column,
                        'reason': blocked,
                    })
                    continue

            state = states[grid_field.table]
            current_value = grid_field.read(state)
            if not values_match(current_value, change.from_value):
                conflicts.append({
                    'rowKey': row_key,
                    'column': change.column,
                    'reason': 'stale',
                    'expected': change.from_value,
                    'actual': current_value,
                })
                continue

            try:
                value = _prepare_value(grid_field, change.to_value)
            except GridBatchError as exc:
                rejected.append({
                    'rowKey': row_key,
                    'column': change.column,
                    'reason': str(exc),
                })
                continue

            grid_field.write(state, value)
            touched[grid_field.table].update(grid_field.columns)
            applied += 1
            rows_touched.add(row_key)
            history_entries.append({
                'row_key': row_key,
                'column': change.column,
                'from_value': current_value,
                'to_value': value,
            })

        for table_key, columns in touched.items():
            _write_table(
                conn,
                spec.tables[table_key],
                row_key,
                states[table_key],
                columns,
                existed.get(table_key, True),
                updated_by,
            )

    record_cell_history(conn, spec, history_entries, updated_by, source='grid')

    return {
        'applied': applied,
        'rows_touched': len(rows_touched),
        'conflicts': conflicts,
        'rejected': rejected,
    }
