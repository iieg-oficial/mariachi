import pytest

from app.services.grid_batch import (
    CellChange,
    GridBatchError,
    GridField,
    GridSpec,
    GridTable,
    apply_cell_changes,
    json_list_item_field,
    json_slot_field,
    values_match,
)


class FakeResult:
    def __init__(self, rows, rowcount=1):
        self._rows = rows
        self.rowcount = rowcount

    def mappings(self):
        return self

    def first(self):
        return self._rows[0] if self._rows else None


class FakeConnection:
    def __init__(self, rows_by_table):
        self.rows_by_table = rows_by_table
        self.statements = []

    def execute(self, statement, params=None):
        sql = str(statement)
        self.statements.append((sql, params or {}))
        if sql.strip().startswith('SELECT'):
            table = 'stats' if 'layer_stats' in sql else 'metadata'
            row = self.rows_by_table.get(table)
            return FakeResult([row] if row is not None else [])
        return FakeResult([], rowcount=1)


METADATA_TABLE = GridTable(
    key='metadata',
    qualified_name='mapalab.layer_metadata',
    primary_key='layer_key',
    columns=('layer_key', 'descripcion', 'fuentes'),
    jsonb_columns=('fuentes',),
    audit_user_column='updated_by',
    audit_timestamp_column='updated_at',
)

STATS_TABLE = GridTable(
    key='stats',
    qualified_name='mapalab.layer_stats',
    primary_key='layer_key',
    columns=('layer_key', 'values', 'stats_config'),
    jsonb_columns=('values', 'stats_config'),
    allow_insert=True,
)


def _spec(guard=None):
    fuentes_read, fuentes_write = json_list_item_field('fuentes', 0, 'corto')
    numeralia_read, numeralia_write = json_slot_field('values', 'posicion', 1, 'valor')
    fields = {
        'descripcion': GridField(
            key='descripcion',
            table='metadata',
            columns=('descripcion',),
            read=lambda row: row.get('descripcion'),
            write=lambda row, value: row.__setitem__('descripcion', value),
            max_length=20,
        ),
        'fuentes_corto': GridField(
            key='fuentes_corto',
            table='metadata',
            columns=('fuentes',),
            read=fuentes_read,
            write=fuentes_write,
        ),
        'numeralia_01_valor': GridField(
            key='numeralia_01_valor',
            table='stats',
            columns=('values',),
            read=numeralia_read,
            write=numeralia_write,
        ),
        'workspace': GridField(
            key='workspace',
            table='metadata',
            columns=('workspace',),
            read=lambda row: row.get('workspace'),
            write=lambda row, value: row.__setitem__('workspace', value),
            editable=False,
        ),
    }
    return GridSpec(
        key='test-grid',
        database='dataengine',
        row_key_field='layer_key',
        tables={'metadata': METADATA_TABLE, 'stats': STATS_TABLE},
        fields=fields,
        fetch_rows=lambda conn, **kwargs: [],
        presence_scope='test',
        guard=guard,
    )


class TestValuesMatch:
    def test_blank_equals_none(self):
        assert values_match('', None)
        assert values_match('   ', None)

    def test_number_as_string(self):
        assert values_match(10, '10')

    def test_different(self):
        assert not values_match('a', 'b')


class TestJsonHelpers:
    def test_list_item_reads_legacy_object(self):
        read, _write = json_list_item_field('fuentes', 0, 'corto')
        assert read({'fuentes': {'corto': 'IIEG'}}) == 'IIEG'

    def test_list_item_writes_normalizing_to_list(self):
        read, write = json_list_item_field('fuentes', 0, 'corto')
        row = {'fuentes': {'corto': 'IIEG', 'largo': 'Instituto'}}
        write(row, 'INEGI')
        assert row['fuentes'] == [{'corto': 'INEGI', 'largo': 'Instituto'}]
        assert read(row) == 'INEGI'

    def test_list_item_clears_to_none_when_empty(self):
        _read, write = json_list_item_field('fuentes', 0, 'corto')
        row = {'fuentes': [{'corto': 'IIEG'}]}
        write(row, None)
        assert row['fuentes'] is None

    def test_slot_creates_and_sorts(self):
        _read, write = json_slot_field('values', 'posicion', 3, 'valor')
        row = {'values': [{'posicion': 5, 'valor': '9'}]}
        write(row, '7')
        assert row['values'] == [
            {'posicion': 3, 'valor': '7'},
            {'posicion': 5, 'valor': '9'},
        ]

    def test_slot_removes_empty_item(self):
        _read, write = json_slot_field('values', 'posicion', 1, 'valor')
        row = {'values': [{'posicion': 1, 'valor': '7'}]}
        write(row, None)
        assert row['values'] == []


class TestApplyCellChanges:
    def test_applies_simple_change(self):
        conn = FakeConnection({'metadata': {'layer_key': 'ws:capa', 'descripcion': 'vieja', 'fuentes': None}})
        result = apply_cell_changes(
            conn,
            _spec(),
            [CellChange('ws:capa', 'descripcion', 'vieja', 'nueva')],
            'quien@iieg.gob.mx',
        )
        assert result['applied'] == 1
        assert result['conflicts'] == []
        update = [s for s, _ in conn.statements if s.startswith('UPDATE')]
        assert len(update) == 1
        assert 'updated_by' in update[0]

    def test_detects_stale_cell(self):
        conn = FakeConnection({'metadata': {'layer_key': 'ws:capa', 'descripcion': 'la de otro', 'fuentes': None}})
        result = apply_cell_changes(
            conn,
            _spec(),
            [CellChange('ws:capa', 'descripcion', 'vieja', 'nueva')],
            'quien@iieg.gob.mx',
        )
        assert result['applied'] == 0
        assert result['conflicts'][0]['reason'] == 'stale'
        assert result['conflicts'][0]['actual'] == 'la de otro'
        assert not [s for s, _ in conn.statements if s.startswith('UPDATE')]

    def test_blank_value_clears_the_cell(self):
        conn = FakeConnection({'metadata': {'layer_key': 'ws:capa', 'descripcion': 'algo', 'fuentes': None}})
        result = apply_cell_changes(
            conn,
            _spec(),
            [CellChange('ws:capa', 'descripcion', 'algo', '')],
            None,
        )
        assert result['applied'] == 1
        _sql, params = [s for s in conn.statements if s[0].startswith('UPDATE')][0]
        assert params['descripcion'] is None

    def test_rejects_value_over_max_length(self):
        conn = FakeConnection({'metadata': {'layer_key': 'ws:capa', 'descripcion': None, 'fuentes': None}})
        result = apply_cell_changes(
            conn,
            _spec(),
            [CellChange('ws:capa', 'descripcion', None, 'x' * 50)],
            None,
        )
        assert result['applied'] == 0
        assert 'maximo' in result['rejected'][0]['reason']

    def test_guard_blocks_column(self):
        conn = FakeConnection({
            'stats': {'layer_key': 'ws:capa', 'values': [], 'stats_config': [{'operation': 'count'}]},
        })

        def guard(conn_, states, grid_field, value):
            if grid_field.table == 'stats' and (states['stats'].get('stats_config') or []):
                return 'numeralia calculada'
            return None

        result = apply_cell_changes(
            conn,
            _spec(guard=guard),
            [CellChange('ws:capa', 'numeralia_01_valor', None, '10')],
            None,
        )
        assert result['applied'] == 0
        assert result['rejected'][0]['reason'] == 'numeralia calculada'

    def test_inserts_when_table_allows_it(self):
        conn = FakeConnection({'stats': None})
        result = apply_cell_changes(
            conn,
            _spec(),
            [CellChange('ws:capa', 'numeralia_01_valor', None, '10')],
            None,
        )
        assert result['applied'] == 1
        assert [s for s, _ in conn.statements if s.startswith('INSERT')]

    def test_missing_row_is_a_conflict(self):
        conn = FakeConnection({'metadata': None})
        result = apply_cell_changes(
            conn,
            _spec(),
            [CellChange('ws:fantasma', 'descripcion', None, 'x')],
            None,
        )
        assert result['applied'] == 0
        assert result['conflicts'][0]['reason'] == 'row_missing'

    def test_read_only_column_is_rejected(self):
        conn = FakeConnection({'metadata': {'layer_key': 'ws:capa'}})
        with pytest.raises(GridBatchError):
            apply_cell_changes(
                conn,
                _spec(),
                [CellChange('ws:capa', 'workspace', None, 'otro')],
                None,
            )

    def test_unknown_column_is_rejected(self):
        conn = FakeConnection({'metadata': {'layer_key': 'ws:capa'}})
        with pytest.raises(GridBatchError):
            apply_cell_changes(
                conn,
                _spec(),
                [CellChange('ws:capa', 'columna_inventada', None, 'x')],
                None,
            )
