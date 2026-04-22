import pytest

from app.services.stats_templates import (
    StatsTemplateError,
    build_query,
    validate_stats_config,
)


class TestValidateStatsConfig:
    def test_empty_returns_empty(self):
        assert validate_stats_config(None) == []
        assert validate_stats_config([]) == []

    def test_rejects_non_list(self):
        with pytest.raises(StatsTemplateError):
            validate_stats_config({'not': 'list'})

    def test_rejects_invalid_operation(self):
        with pytest.raises(StatsTemplateError, match='operation invalido'):
            validate_stats_config([{
                'operation': 'drop_table', 'schema': 'x', 'table': 'y', 'position': 1
            }])

    def test_rejects_sql_injection_in_schema(self):
        with pytest.raises(StatsTemplateError, match='schema invalido'):
            validate_stats_config([{
                'operation': 'count',
                'schema': 'public"; DROP TABLE users; --',
                'table': 't',
                'position': 1,
            }])

    def test_rejects_sql_injection_in_table(self):
        with pytest.raises(StatsTemplateError, match='table invalido'):
            validate_stats_config([{
                'operation': 'count',
                'schema': 'public',
                'table': 'users; DROP',
                'position': 1,
            }])

    def test_rejects_invalid_field(self):
        with pytest.raises(StatsTemplateError, match='field invalido'):
            validate_stats_config([{
                'operation': 'sum', 'schema': 'x', 'table': 'y',
                'field': 'col); SELECT',
                'position': 1,
            }])

    def test_requires_field_for_non_count(self):
        with pytest.raises(StatsTemplateError, match='field requerido'):
            validate_stats_config([{
                'operation': 'sum', 'schema': 'x', 'table': 'y', 'position': 1
            }])

    def test_count_does_not_require_field(self):
        result = validate_stats_config([{
            'operation': 'count', 'schema': 'x', 'table': 'y', 'position': 1
        }])
        assert len(result) == 1

    def test_count_where_requires_where_field_and_value(self):
        with pytest.raises(StatsTemplateError):
            validate_stats_config([{
                'operation': 'count_where', 'schema': 'x', 'table': 'y',
                'field': 'f', 'position': 1
            }])

    def test_latest_requires_order_field(self):
        with pytest.raises(StatsTemplateError, match='requiere order_field'):
            validate_stats_config([{
                'operation': 'latest', 'schema': 'x', 'table': 'y', 'field': 'f', 'position': 1
            }])

    def test_rejects_duplicate_positions(self):
        with pytest.raises(StatsTemplateError, match='duplicadas'):
            validate_stats_config([
                {'operation': 'count', 'schema': 'x', 'table': 'y', 'position': 1},
                {'operation': 'count', 'schema': 'x', 'table': 'y', 'position': 1},
            ])

    def test_position_out_of_range(self):
        with pytest.raises(StatsTemplateError, match='1-8'):
            validate_stats_config([{
                'operation': 'count', 'schema': 'x', 'table': 'y', 'position': 9
            }])

    def test_accepts_valid_config(self):
        result = validate_stats_config([{
            'operation': 'sum',
            'schema': 'seguridad',
            'table': 'delitos',
            'field': 'total',
            'position': 1,
            'label': 'Total',
        }])
        assert result[0]['operation'] == 'sum'
        assert result[0]['label'] == 'Total'


class TestBuildQuery:
    def test_count(self):
        sql, params = build_query({'operation': 'count', 'schema': 's', 'table': 't'})
        assert sql == 'SELECT COUNT(*) FROM "s"."t"'
        assert params == {}

    def test_count_distinct(self):
        sql, _ = build_query({'operation': 'count_distinct', 'schema': 's', 'table': 't', 'field': 'f'})
        assert sql == 'SELECT COUNT(DISTINCT "f") FROM "s"."t"'

    def test_count_where_uses_parameter(self):
        sql, params = build_query({
            'operation': 'count_where', 'schema': 's', 'table': 't',
            'where_field': 'tipo', 'where_value': 'ACTIVO',
        })
        assert ':where_value' in sql
        assert params == {'where_value': 'ACTIVO'}

    def test_latest(self):
        sql, _ = build_query({
            'operation': 'latest', 'schema': 's', 'table': 't',
            'field': 'valor', 'order_field': 'fecha',
        })
        assert 'ORDER BY "fecha" DESC' in sql
        assert 'LIMIT 1' in sql

    def test_quotes_identifiers(self):
        sql, _ = build_query({'operation': 'sum', 'schema': 'x', 'table': 'y', 'field': 'z'})
        assert '"x"."y"' in sql
        assert '"z"' in sql
