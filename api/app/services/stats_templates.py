from __future__ import annotations

import re
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Connection

PRIMITIVE_OPERATIONS = {'count', 'count_distinct', 'count_where', 'sum', 'avg', 'min', 'max', 'latest'}
OPERATIONS_WITHOUT_FIELD = {'count', 'count_where'}
COMBINATOR_OPS = {'add', 'sub', 'mul', 'div', 'percent', 'percent_change'}
STATS_OPERATIONS = PRIMITIVE_OPERATIONS | {'formula', 'static'}
FILTER_OPS = {'eq', 'in', 'gte', 'lte', 'between', 'is_not_null'}
CONTEXT_KEYS = {'municipio', 'municipio.claves', 'municipio.nombres', 'fecha.inicio', 'fecha.fin'}
MUNICIPIO_FIELD_TOKEN = '@municipio'
MUNICIPIO_CONTEXT_BY_TYPE = {'clave': '{{municipio.claves}}', 'nombre': '{{municipio.nombres}}'}
MAX_FILTERS = 6
SQL_COMPARATORS = {'eq': '=', 'gte': '>=', 'lte': '<='}

_PLACEHOLDER = re.compile(r'^\{\{([a-z_.]+)\}\}$')


class StatsTemplateError(ValueError):
    pass


def _validate_identifier(value: str, label: str) -> str:
    if not value or not isinstance(value, str):
        raise StatsTemplateError(f'{label} vacio o invalido')
    if not all(c.isalnum() or c == '_' for c in value):
        raise StatsTemplateError(f"{label} invalido: '{value}' (solo letras, numeros, underscore)")
    if len(value) > 100:
        raise StatsTemplateError(f'{label} demasiado largo')
    return value


def _validate_value(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (int, float, bool)):
        return value
    if isinstance(value, str):
        if len(value) > 500:
            raise StatsTemplateError('value demasiado largo')
        return value
    raise StatsTemplateError(f'value de tipo no soportado: {type(value).__name__}')


def _placeholder_key(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    match = _PLACEHOLDER.match(value.strip())
    return match.group(1) if match else None


def _validate_filter_value(value: Any, label: str) -> Any:
    key = _placeholder_key(value)
    if key is not None:
        if key not in CONTEXT_KEYS:
            raise StatsTemplateError(
                f"{label}: contexto '{key}' desconocido. Opciones: {sorted(CONTEXT_KEYS)}"
            )
        return value.strip()
    return _validate_value(value)


def _validate_filter(raw: Any, label: str) -> dict:
    if not isinstance(raw, dict):
        raise StatsTemplateError(f'{label} debe ser objeto')
    raw_field = raw.get('field', '')
    field = (
        MUNICIPIO_FIELD_TOKEN
        if raw_field == MUNICIPIO_FIELD_TOKEN
        else _validate_identifier(raw_field, f'{label}.field')
    )
    op = raw.get('op')
    if op not in FILTER_OPS:
        raise StatsTemplateError(f"{label}.op invalido: '{op}'. Opciones: {sorted(FILTER_OPS)}")
    if op == 'is_not_null':
        return {'field': field, 'op': op, 'value': None}

    value = raw.get('value')
    if value is None:
        raise StatsTemplateError(f"{label} con op='{op}' requiere value")

    if _placeholder_key(value) is not None:
        return {'field': field, 'op': op, 'value': _validate_filter_value(value, label)}

    if op == 'in':
        if not isinstance(value, list) or not value:
            raise StatsTemplateError(f"{label} con op='in' requiere lista no vacia")
        if len(value) > 200:
            raise StatsTemplateError(f"{label} con op='in' admite hasta 200 valores")
        return {'field': field, 'op': op, 'value': [_validate_filter_value(v, label) for v in value]}

    if op == 'between':
        if not isinstance(value, list) or len(value) != 2:
            raise StatsTemplateError(f"{label} con op='between' requiere [inicio, fin]")
        return {'field': field, 'op': op, 'value': [_validate_filter_value(v, label) for v in value]}

    return {'field': field, 'op': op, 'value': _validate_filter_value(value, label)}


def _validate_filters(raw: Any, label: str) -> list[dict]:
    if raw is None:
        return []
    if not isinstance(raw, list):
        raise StatsTemplateError(f'{label}.filters debe ser lista')
    if len(raw) > MAX_FILTERS:
        raise StatsTemplateError(f'{label}.filters admite hasta {MAX_FILTERS} condiciones')
    return [_validate_filter(f, f'{label}.filters[{i}]') for i, f in enumerate(raw)]


def _validate_primitive(cfg: dict, label: str) -> dict:
    op = cfg.get('operation')
    if op not in PRIMITIVE_OPERATIONS:
        raise StatsTemplateError(f"{label}.operation primitiva invalida: '{op}'")
    schema = _validate_identifier(cfg.get('schema', ''), f'{label}.schema')
    table = _validate_identifier(cfg.get('table', ''), f'{label}.table')
    field = cfg.get('field')
    if op not in OPERATIONS_WITHOUT_FIELD and not field:
        raise StatsTemplateError(f"{label}.field requerido para operation='{op}'")
    if field:
        _validate_identifier(field, f'{label}.field')
    where_field = cfg.get('where_field')
    where_value = cfg.get('where_value')
    if where_field:
        _validate_identifier(where_field, f'{label}.where_field')
    filters = _validate_filters(cfg.get('filters'), label)
    if op == 'count_where' and not filters and (not where_field or where_value is None):
        raise StatsTemplateError(
            f"{label} con operation='count_where' requiere where_field y where_value, o filters"
        )
    if where_value is not None:
        _validate_value(where_value)
    order_field = cfg.get('order_field')
    if order_field:
        _validate_identifier(order_field, f'{label}.order_field')
    if op == 'latest' and not order_field:
        raise StatsTemplateError(f"{label} con operation='latest' requiere order_field")
    return {
        'operation': op,
        'schema': schema,
        'table': table,
        'field': field,
        'where_field': where_field,
        'where_value': where_value,
        'order_field': order_field,
        'filters': filters,
    }


def _validate_expression(expr: Any, label: str, depth: int = 0) -> dict:
    if depth > 6:
        raise StatsTemplateError(f'{label}: expresion demasiado anidada (max 6)')
    if not isinstance(expr, dict):
        raise StatsTemplateError(f'{label}: expresion debe ser objeto')

    if 'literal' in expr:
        lit = expr['literal']
        if not isinstance(lit, (int, float)):
            raise StatsTemplateError(f'{label}.literal debe ser numerico')
        return {'literal': lit}

    if 'operation' in expr and expr.get('operation') in PRIMITIVE_OPERATIONS:
        return _validate_primitive(expr, label)

    op = expr.get('op')
    if op not in COMBINATOR_OPS:
        raise StatsTemplateError(
            f"{label}.op invalido: '{op}'. Opciones: {sorted(COMBINATOR_OPS)}"
        )
    left = expr.get('left')
    right = expr.get('right')
    if left is None or right is None:
        raise StatsTemplateError(f'{label}: combinator requiere left y right')
    return {
        'op': op,
        'left': _validate_expression(left, f'{label}.left', depth + 1),
        'right': _validate_expression(right, f'{label}.right', depth + 1),
    }


def validate_stats_config(stats_config: list | None) -> list:
    if not stats_config:
        return []
    if not isinstance(stats_config, list):
        raise StatsTemplateError('stats_config debe ser lista')

    validated = []
    for i, cfg in enumerate(stats_config):
        if not isinstance(cfg, dict):
            raise StatsTemplateError(f'stats_config[{i}] no es dict')

        op = cfg.get('operation')
        if op not in STATS_OPERATIONS:
            raise StatsTemplateError(
                f"stats_config[{i}].operation invalido: '{op}'. "
                f"Opciones: {sorted(STATS_OPERATIONS)}"
            )

        position = cfg.get('position') or cfg.get('posicion')
        if not isinstance(position, int) or position < 1 or position > 8:
            raise StatsTemplateError(f'stats_config[{i}].position debe ser int 1-8')

        common = {
            'position': position,
            'operation': op,
            'label': cfg.get('label') or cfg.get('nombre'),
            'symbol': cfg.get('symbol') or cfg.get('simbolo'),
            'format': cfg.get('format'),
        }

        if op == 'static':
            value = cfg.get('value') if 'value' in cfg else cfg.get('valor')
            if value is None:
                raise StatsTemplateError(f"stats_config[{i}] static requiere 'value'")
            _validate_value(value)
            validated.append({**common, 'value': value})
            continue

        if op == 'formula':
            expr = cfg.get('expression')
            if not isinstance(expr, dict):
                raise StatsTemplateError(f'stats_config[{i}].expression requerido para formula')
            validated.append({**common, 'expression': _validate_expression(expr, f'stats_config[{i}].expression')})
            continue

        # primitiva
        primitive = _validate_primitive(cfg, f'stats_config[{i}]')
        validated.append({**common, **primitive})

    positions = [v['position'] for v in validated]
    if len(positions) != len(set(positions)):
        raise StatsTemplateError('positions duplicadas en stats_config')

    return validated


MAX_MUNICIPIOS = 125

_CLAVE_PATTERN = re.compile(r'^\d{5}$')
_DATE_PATTERN = re.compile(r'^\d{4}-\d{2}-\d{2}$')


def _parse_claves(municipio: str | None) -> list[str]:
    if not municipio:
        return []
    claves = [c.strip() for c in municipio.split(',') if c.strip()]
    if len(claves) > MAX_MUNICIPIOS:
        raise StatsTemplateError(f'municipio admite hasta {MAX_MUNICIPIOS} claves')
    for clave in claves:
        if not _CLAVE_PATTERN.match(clave):
            raise StatsTemplateError(f"clave de municipio invalida: '{clave}' (5 digitos)")
    return sorted(set(claves))


def build_stats_context(
    conn: Connection,
    municipio: str | None = None,
    fecha_inicio: str | None = None,
    fecha_fin: str | None = None,
) -> dict:
    for label, value in (('fecha_inicio', fecha_inicio), ('fecha_fin', fecha_fin)):
        if value and not _DATE_PATTERN.match(value):
            raise StatsTemplateError(f'{label} debe tener formato YYYY-MM-DD')

    context: dict = {}
    claves = _parse_claves(municipio)
    if claves:
        rows = conn.execute(
            text('SELECT clave_geo, nombre FROM mapalab.municipios WHERE clave_geo = ANY(:claves)'),
            {'claves': claves},
        ).fetchall()
        context['municipio.claves'] = claves
        context['municipio.nombres'] = [r[1] for r in rows]
    if fecha_inicio:
        context['fecha.inicio'] = fecha_inicio
    if fecha_fin:
        context['fecha.fin'] = fecha_fin
    return context


def load_layer_binding(conn: Connection, layer_key: str) -> dict | None:
    sql = """
        WITH RECURSIVE cadena AS (
            SELECT l.id, l.parent_id, l.municipio_field, l.municipio_field_type
            FROM mapalab.layers l
            JOIN mapalab.workspaces w ON w.alias = l.workspace_alias
            WHERE w.geoserver_workspace || ':' || l.geoserver_layer = :layer_key
              AND l.deleted_at IS NULL
            UNION ALL
            SELECT p.id, p.parent_id, p.municipio_field, p.municipio_field_type
            FROM mapalab.layers p
            JOIN cadena c ON c.parent_id = p.id
            WHERE p.deleted_at IS NULL
        )
        SELECT municipio_field, municipio_field_type
        FROM cadena
        WHERE municipio_field IS NOT NULL
        LIMIT 1
    """
    row = conn.execute(text(sql), {'layer_key': layer_key}).first()
    if not row:
        return None
    return {'municipio_field': row[0], 'municipio_field_type': row[1]}


def _bind_filter(item: dict, binding: dict | None) -> dict | None:
    bound = dict(item)
    if bound['field'] == MUNICIPIO_FIELD_TOKEN:
        field = (binding or {}).get('municipio_field')
        if not field:
            return None
        bound['field'] = field
    if _placeholder_key(bound.get('value')) == 'municipio':
        tipo = (binding or {}).get('municipio_field_type')
        replacement = MUNICIPIO_CONTEXT_BY_TYPE.get(tipo)
        if not replacement:
            return None
        bound['value'] = replacement
    return bound


def bind_layer_fields(stats_config: list | None, binding: dict | None) -> list:
    bound_config = []
    for cfg in stats_config or []:
        item = dict(cfg)
        if item.get('filters'):
            item['filters'] = [
                f for f in (_bind_filter(f, binding) for f in item['filters']) if f is not None
            ]
        if item.get('operation') == 'formula' and isinstance(item.get('expression'), dict):
            item['expression'] = _bind_expression(item['expression'], binding)
        bound_config.append(item)
    return bound_config


def _bind_expression(expr: dict, binding: dict | None) -> dict:
    bound = dict(expr)
    if bound.get('filters'):
        bound['filters'] = [
            f for f in (_bind_filter(f, binding) for f in bound['filters']) if f is not None
        ]
    for side in ('left', 'right'):
        if isinstance(bound.get(side), dict):
            bound[side] = _bind_expression(bound[side], binding)
    return bound


def _resolve_context(value: Any, context: dict | None) -> tuple[Any, bool]:
    key = _placeholder_key(value)
    if key is None:
        return value, True
    resolved = (context or {}).get(key)
    if resolved is None:
        return None, False
    if isinstance(resolved, (list, tuple)) and not resolved:
        return None, False
    return resolved, True


def _build_conditions(filters: list[dict], context: dict | None, params: dict) -> list[str]:
    conditions: list[str] = []
    for i, item in enumerate(filters):
        field = item['field']
        op = item['op']
        if op == 'is_not_null':
            conditions.append(f'"{field}" IS NOT NULL')
            continue

        value = item['value']
        if op == 'between':
            bounds = value if isinstance(value, list) else [value]
            resolved = [_resolve_context(v, context) for v in bounds]
            if len(resolved) != 2 or not all(ok for _, ok in resolved):
                continue
            low, high = f'f{i}_lo', f'f{i}_hi'
            params[low], params[high] = resolved[0][0], resolved[1][0]
            conditions.append(f'"{field}" BETWEEN :{low} AND :{high}')
            continue

        if op == 'in':
            raw = value if isinstance(value, list) else [value]
            expanded: list[Any] = []
            for entry in raw:
                item_value, ok = _resolve_context(entry, context)
                if not ok:
                    continue
                if isinstance(item_value, (list, tuple)):
                    expanded.extend(item_value)
                else:
                    expanded.append(item_value)
            if not expanded:
                continue
            names = []
            for j, entry in enumerate(expanded):
                name = f'f{i}_{j}'
                params[name] = entry
                names.append(f':{name}')
            conditions.append(f'"{field}" IN ({", ".join(names)})')
            continue

        resolved, ok = _resolve_context(value, context)
        if not ok:
            continue
        name = item.get('param') or f'f{i}'
        params[name] = resolved
        conditions.append(f'"{field}" {SQL_COMPARATORS[op]} :{name}')
    return conditions


def _effective_filters(cfg: dict) -> list[dict]:
    filters = list(cfg.get('filters') or [])
    where_field = cfg.get('where_field')
    where_value = cfg.get('where_value')
    if where_field and where_value is not None:
        legacy = {'field': where_field, 'op': 'eq', 'value': where_value, 'param': 'where_value'}
        return [legacy] + filters
    return filters


def build_query(cfg: dict, context: dict | None = None) -> tuple[str, dict]:
    op = cfg['operation']
    schema = cfg['schema']
    table = cfg['table']
    field = cfg.get('field')
    order_field = cfg.get('order_field')

    fqtn = f'"{schema}"."{table}"'
    params: dict = {}
    conditions = _build_conditions(_effective_filters(cfg), context, params)
    where = f' WHERE {" AND ".join(conditions)}' if conditions else ''

    if op in ('count', 'count_where'):
        sql = f'SELECT COUNT(*) FROM {fqtn}{where}'
    elif op == 'count_distinct':
        sql = f'SELECT COUNT(DISTINCT "{field}") FROM {fqtn}{where}'
    elif op in ('sum', 'avg', 'min', 'max'):
        sql = f'SELECT {op.upper()}("{field}") FROM {fqtn}{where}'
    elif op == 'latest':
        sql = f'SELECT "{field}" FROM {fqtn}{where} ORDER BY "{order_field}" DESC LIMIT 1'
    else:
        raise StatsTemplateError(f'operation no manejada: {op}')

    return sql, params


def _to_number(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return float(value)
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _evaluate_expression(conn: Connection, expr: dict, context: dict | None = None) -> Any:
    if 'literal' in expr:
        return expr['literal']
    if 'operation' in expr and expr.get('operation') in PRIMITIVE_OPERATIONS:
        return execute_primitive(conn, expr, context)
    op = expr['op']
    left = _to_number(_evaluate_expression(conn, expr['left'], context))
    right = _to_number(_evaluate_expression(conn, expr['right'], context))
    if left is None or right is None:
        return None
    if op == 'add':
        return left + right
    if op == 'sub':
        return left - right
    if op == 'mul':
        return left * right
    if op == 'div':
        return left / right if right != 0 else None
    if op == 'percent':
        return (left / right) * 100 if right != 0 else None
    if op == 'percent_change':
        return ((left - right) / right) * 100 if right != 0 else None
    raise StatsTemplateError(f'op combinator no manejada: {op}')


def execute_primitive(conn: Connection, cfg: dict, context: dict | None = None) -> Any:
    sql, params = build_query(cfg, context)
    return conn.execute(text(sql), params).scalar()


def execute_stat(conn: Connection, cfg: dict, context: dict | None = None) -> Any:
    op = cfg.get('operation')
    if op == 'static':
        return cfg.get('value')
    if op == 'formula':
        return _evaluate_expression(conn, cfg['expression'], context)
    return execute_primitive(conn, cfg, context)


def format_stat_value(value: Any, fmt: str | None) -> str | None:
    if value is None:
        return None
    if not fmt:
        return str(value)
    number = _to_number(value)
    if number is None:
        return str(value)
    if fmt == 'integer':
        return str(int(round(number)))
    if fmt == 'decimal_2':
        return f'{number:.2f}'
    if fmt == 'percentage':
        return f'{number:.1f}'
    if fmt == 'currency_mxn':
        return f'{number:.2f}'
    if fmt == 'compact':
        for threshold, suffix in ((1_000_000_000, 'B'), (1_000_000, 'M'), (1_000, 'K')):
            if abs(number) >= threshold:
                return f'{number / threshold:.1f}{suffix}'
        return str(int(number)) if number == int(number) else f'{number:.1f}'
    return str(value)


def execute_stats_batch(
    conn: Connection,
    stats_config: list | None,
    context: dict | None = None,
) -> tuple[list[dict], list[dict]]:
    """Ejecuta cada stat aislada en un SAVEPOINT.

    Sin el savepoint, una query fallida aborta la transaccion completa en Postgres y
    todas las stats siguientes fallan en cascada, incluido el COMMIT.
    """
    values: list[dict] = []
    errors: list[dict] = []

    for raw_cfg in stats_config or []:
        if not isinstance(raw_cfg, dict):
            errors.append({'position': None, 'label': None, 'error': 'entrada de configuracion invalida'})
            continue

        position = raw_cfg.get('position') or raw_cfg.get('posicion')
        label = raw_cfg.get('label') or raw_cfg.get('nombre')

        try:
            cfg = validate_stats_config([raw_cfg])[0]
        except StatsTemplateError as exc:
            errors.append({'position': position, 'label': label, 'error': str(exc)})
            continue

        needs_db = cfg.get('operation') != 'static'

        savepoint = conn.begin_nested() if needs_db else None
        try:
            raw = execute_stat(conn, cfg, context)
            if savepoint is not None:
                savepoint.commit()
        except Exception as exc:
            if savepoint is not None:
                savepoint.rollback()
            errors.append({'position': position, 'label': label, 'error': str(exc)})
            continue

        values.append({
            'posicion': position,
            'valor': format_stat_value(raw, cfg.get('format')),
            'nombre': label,
            'simbolo': cfg.get('symbol') or cfg.get('simbolo'),
        })

    values.sort(key=lambda item: item['posicion'] if isinstance(item['posicion'], int) else 99)
    return values, errors
