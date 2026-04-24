from __future__ import annotations

from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Connection

STATS_OPERATIONS = {'count', 'count_distinct', 'count_where', 'sum', 'avg', 'min', 'max', 'latest'}


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

        schema = _validate_identifier(cfg.get('schema', ''), f'stats_config[{i}].schema')
        table = _validate_identifier(cfg.get('table', ''), f'stats_config[{i}].table')

        field = cfg.get('field')
        if op != 'count' and not field:
            raise StatsTemplateError(
                f"stats_config[{i}].field requerido para operation='{op}'"
            )
        if field:
            _validate_identifier(field, f'stats_config[{i}].field')

        where_field = cfg.get('where_field')
        where_value = cfg.get('where_value')
        if where_field:
            _validate_identifier(where_field, f'stats_config[{i}].where_field')
        if op == 'count_where' and (not where_field or where_value is None):
            raise StatsTemplateError(
                f"stats_config[{i}] con operation='count_where' requiere where_field y where_value"
            )
        if where_value is not None:
            _validate_value(where_value)

        order_field = cfg.get('order_field')
        if order_field:
            _validate_identifier(order_field, f'stats_config[{i}].order_field')
        if op == 'latest' and not order_field:
            raise StatsTemplateError(
                f"stats_config[{i}] con operation='latest' requiere order_field"
            )

        position = cfg.get('position') or cfg.get('posicion')
        if not isinstance(position, int) or position < 1 or position > 8:
            raise StatsTemplateError(f'stats_config[{i}].position debe ser int 1-8')

        validated.append({
            'position': position,
            'operation': op,
            'schema': schema,
            'table': table,
            'field': field,
            'where_field': where_field,
            'where_value': where_value,
            'order_field': order_field,
            'label': cfg.get('label') or cfg.get('nombre'),
            'symbol': cfg.get('symbol') or cfg.get('simbolo'),
            'format': cfg.get('format'),
        })

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


def execute_stat(conn: Connection, cfg: dict) -> Any:
    sql, params = build_query(cfg)
    return conn.execute(text(sql), params).scalar()
