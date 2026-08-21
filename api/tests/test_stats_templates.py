import pytest

from app.services.stats_templates import (
    StatsTemplateError,
    build_query,
    execute_stats_batch,
    format_stat_value,
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

    def test_count_where_does_not_require_field(self):
        result = validate_stats_config([{
            'operation': 'count_where', 'schema': 'x', 'table': 'y',
            'where_field': 'nivel', 'where_value': 'Primaria', 'position': 1
        }])
        assert len(result) == 1
        assert result[0]['field'] is None

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


class TestFormatStatValue:
    def test_none_stays_none(self):
        assert format_stat_value(None, 'integer') is None

    def test_no_format_is_plain_string(self):
        assert format_stat_value(18978.95, None) == '18978.95'

    def test_integer_rounds(self):
        assert format_stat_value(18978.95, 'integer') == '18979'

    def test_decimal_2_truncates_noise(self):
        assert format_stat_value(123.456789012, 'decimal_2') == '123.46'

    def test_percentage_one_decimal(self):
        assert format_stat_value(66.6666, 'percentage') == '66.7'

    def test_compact(self):
        assert format_stat_value(1234, 'compact') == '1.2K'
        assert format_stat_value(4_500_000, 'compact') == '4.5M'
        assert format_stat_value(42, 'compact') == '42'

    def test_non_numeric_survives(self):
        assert format_stat_value('Jalisco', 'integer') == 'Jalisco'

    def test_output_stays_parseable_by_visor(self):
        assert format_stat_value(1234.5, 'decimal_2') == '1234.50'


class _FakeSavepoint:
    def __init__(self, log):
        self._log = log
        self.committed = False
        self.rolled_back = False

    def commit(self):
        self.committed = True
        self._log.append('commit')

    def rollback(self):
        self.rolled_back = True
        self._log.append('rollback')


class _FakeConn:
    """Simula el envenenamiento de transaccion de Postgres: tras un error, toda
    query posterior falla salvo que un SAVEPOINT haya revertido el fallo."""

    def __init__(self, results):
        self._results = results
        self._poisoned = False
        self.savepoints = []
        self.log = []

    def begin_nested(self):
        savepoint = _FakeSavepoint(self.log)
        self.savepoints.append(savepoint)
        return savepoint

    def execute(self, *_args, **_kwargs):
        if self._poisoned:
            raise RuntimeError('current transaction is aborted')
        outcome = self._results.pop(0)
        if isinstance(outcome, Exception):
            self._poisoned = True
            raise outcome

        class _Result:
            def scalar(self):
                return outcome

        return _Result()

    def _heal(self):
        self._poisoned = False


class _HealingConn(_FakeConn):
    def begin_nested(self):
        savepoint = super().begin_nested()
        original_rollback = savepoint.rollback

        def rollback():
            original_rollback()
            self._heal()

        savepoint.rollback = rollback
        return savepoint


class TestExecuteStatsBatch:
    def _cfg(self, position, **extra):
        base = {
            'operation': 'count',
            'schema': 's',
            'table': 't',
            'position': position,
            'label': f'stat {position}',
        }
        base.update(extra)
        return base

    def test_empty_config(self):
        values, errors = execute_stats_batch(_FakeConn([]), [])
        assert values == []
        assert errors == []

    def test_happy_path_orders_by_position(self):
        conn = _FakeConn([10, 20])
        values, errors = execute_stats_batch(conn, [self._cfg(2), self._cfg(1)])
        assert errors == []
        assert [v['posicion'] for v in values] == [1, 2]

    def test_static_does_not_open_savepoint(self):
        conn = _FakeConn([])
        values, errors = execute_stats_batch(
            conn, [{'operation': 'static', 'value': '42', 'position': 1, 'label': 'fijo'}]
        )
        assert conn.savepoints == []
        assert values[0]['valor'] == '42'
        assert errors == []

    def test_failed_stat_does_not_poison_the_rest(self):
        conn = _HealingConn([RuntimeError('relation does not exist'), 99])
        values, errors = execute_stats_batch(conn, [self._cfg(1), self._cfg(2)])

        assert len(errors) == 1
        assert errors[0]['position'] == 1
        assert len(values) == 1
        assert values[0]['posicion'] == 2
        assert values[0]['valor'] == '99'
        assert conn.savepoints[0].rolled_back is True
        assert conn.savepoints[1].committed is True

    def test_failed_stat_is_omitted_not_nulled(self):
        conn = _HealingConn([RuntimeError('boom')])
        values, errors = execute_stats_batch(conn, [self._cfg(1)])
        assert values == []
        assert len(errors) == 1

    def test_applies_format(self):
        conn = _FakeConn([123.456789])
        values, _ = execute_stats_batch(conn, [self._cfg(1, operation='avg', field='x', format='decimal_2')])
        assert values[0]['valor'] == '123.46'

    def test_revalidates_config_read_from_db(self):
        conn = _FakeConn([1])
        values, errors = execute_stats_batch(conn, [{
            'operation': 'count',
            'schema': 'public"; DROP TABLE users; --',
            'table': 't',
            'position': 1,
        }])
        assert values == []
        assert 'schema invalido' in errors[0]['error']

    def test_accepts_spanish_aliases(self):
        conn = _FakeConn([5])
        values, _ = execute_stats_batch(conn, [{
            'operation': 'count', 'schema': 's', 'table': 't',
            'posicion': 3, 'nombre': 'Total', 'simbolo': 'ha',
        }])
        assert values[0]['posicion'] == 3
        assert values[0]['nombre'] == 'Total'
        assert values[0]['simbolo'] == 'ha'
