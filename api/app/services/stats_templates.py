from __future__ import annotations

from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Connection

PRIMITIVE_OPERATIONS = {'count', 'count_distinct', 'count_where', 'sum', 'avg', 'min', 'max', 'latest'}
OPERATIONS_WITHOUT_FIELD = {'count', 'count_where'}
COMBINATOR_OPS = {'add', 'sub', 'mul', 'div', 'percent', 'percent_change'}
STATS_OPERATIONS = PRIMITIVE_OPERATIONS | {'formula', 'static'}


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
    if op == 'count_where' and (not where_field or where_value is None):
        raise StatsTemplateError(f"{label} con operation='count_where' requiere where_field y where_value")
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


def build_query(cfg: dict) -> tuple[str, dict]:
    op = cfg['operation']
    schema = cfg['schema']
    table = cfg['table']
    field = cfg.get('field')
    where_field = cfg.get('where_field')
    where_value = cfg.get('where_value')
    order_field = cfg.get('order_field')

    fqtn = f'"{schema}"."{table}"'
    params: dict = {}

    if op == 'count':
        sql = f'SELECT COUNT(*) FROM {fqtn}'
    elif op == 'count_distinct':
        sql = f'SELECT COUNT(DISTINCT "{field}") FROM {fqtn}'
    elif op == 'count_where':
        sql = f'SELECT COUNT(*) FROM {fqtn} WHERE "{where_field}" = :where_value'
        params['where_value'] = where_value
    elif op == 'sum':
        sql = f'SELECT SUM("{field}") FROM {fqtn}'
    elif op == 'avg':
        sql = f'SELECT AVG("{field}") FROM {fqtn}'
    elif op == 'min':
        sql = f'SELECT MIN("{field}") FROM {fqtn}'
    elif op == 'max':
        sql = f'SELECT MAX("{field}") FROM {fqtn}'
    elif op == 'latest':
        sql = f'SELECT "{field}" FROM {fqtn} ORDER BY "{order_field}" DESC LIMIT 1'
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


def _evaluate_expression(conn: Connection, expr: dict) -> Any:
    if 'literal' in expr:
        return expr['literal']
    if 'operation' in expr and expr.get('operation') in PRIMITIVE_OPERATIONS:
        return execute_primitive(conn, expr)
    op = expr['op']
    left = _to_number(_evaluate_expression(conn, expr['left']))
    right = _to_number(_evaluate_expression(conn, expr['right']))
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


def execute_primitive(conn: Connection, cfg: dict) -> Any:
    sql, params = build_query(cfg)
    return conn.execute(text(sql), params).scalar()


def execute_stat(conn: Connection, cfg: dict) -> Any:
    op = cfg.get('operation')
    if op == 'static':
        return cfg.get('value')
    if op == 'formula':
        return _evaluate_expression(conn, cfg['expression'])
    return execute_primitive(conn, cfg)


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


def execute_stats_batch(conn: Connection, stats_config: list | None) -> tuple[list[dict], list[dict]]:
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
            raw = execute_stat(conn, cfg)
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
