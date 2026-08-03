import pytest

from app.services.grid_batch import (
    CellChange,
    GridBatchError,
    apply_cell_changes,
    array_literal,
)
from app.services.grids.layer_config_grid import (
    FIELDS,
    SPEC,
    _guard,
)


class FakeResult:
    def __init__(self, rows, rowcount=1):
        self._rows = rows
        self.rowcount = rowcount

    def mappings(self):
        return self

    def first(self):
        return self._rows[0] if self._rows else None

    def all(self):
        return self._rows


class FakeConnection:
    def __init__(self, row=None, workspace_row=None):
        self.row = row
        self.workspace_row = workspace_row
        self.statements = []

    def execute(self, statement, params=None):
        sql = str(statement)
        self.statements.append((sql, params or {}))
        if sql.strip().startswith('SELECT'):
            if 'mapalab.workspaces' in sql:
                return FakeResult([self.workspace_row] if self.workspace_row else [])
            return FakeResult([self.row] if self.row is not None else [])
        return FakeResult([], rowcount=1)


def _layer_row(**overrides):
    row = {column: None for column in SPEC.tables['layers'].columns}
    row.update({
        'id': 'salud-hospitales',
        'label': 'Hospitales',
        'node_type': 'leaf',
        'sort_order': 0,
        'workspace_alias': 'salud',
        'geoserver_layer': 'hospitales',
        'styles': '',
        'cql_filter': '',
        'tiled': True,
        'image_format': 'image/png',
        'antialias': 'text',
        'hidden_in_menu': False,
        'disabled': False,
        'wfs_available': True,
        'downloadable': True,
        'time_enabled': False,
        'hide_periodicity': False,
        'has_municipio': False,
    })
    row.update(overrides)
    return row


class TestCampos:
    def test_default_date_ida_y_vuelta(self):
        field = FIELDS['default_date']
        row = {'default_date': {'year': 2024}}
        assert field.read(row) == '2024'

        field.write(row, '2020')
        assert row['default_date'] == {'year': 2020}

        field.write(row, 'latest')
        assert row['default_date'] == 'latest'
        assert field.read(row) == 'latest'

    def test_default_date_rechaza_texto_libre(self):
        with pytest.raises(GridBatchError):
            FIELDS['default_date'].coerce('el mas nuevo')

    def test_search_tags_se_normalizan_a_lista(self):
        field = FIELDS['search_tags']
        row = {'search_tags': ['salud', 'hospital']}
        assert field.read(row) == 'salud, hospital'

        field.write(row, ' Salud , HOSPITAL ,, ')
        assert row['search_tags'] == ['salud', 'hospital']

        field.write(row, None)
        assert row['search_tags'] is None

    def test_array_literal_escapa_comillas(self):
        assert array_literal(['a', 'b"c']) == '{"a","b\\"c"}'
        assert array_literal(None) is None

    def test_node_type_invalido_se_rechaza(self):
        with pytest.raises(GridBatchError):
            FIELDS['node_type'].coerce('carpeta')
        assert FIELDS['node_type'].coerce('leaf') == 'leaf'

    def test_slug_invalido_se_rechaza(self):
        with pytest.raises(GridBatchError):
            FIELDS['slug'].coerce('Con Mayusculas')
        assert FIELDS['slug'].coerce(' hospitales-2024 ') == 'hospitales-2024'

    def test_bool_vacio_no_escribe_null(self):
        row = {'tiled': True}
        FIELDS['tiled'].write(row, None)
        assert row['tiled'] is False

    def test_texto_not_null_vacio_escribe_cadena(self):
        row = {'cql_filter': "tipo='A'"}
        FIELDS['cql_filter'].write(row, None)
        assert row['cql_filter'] == ''


class TestGuard:
    def test_campo_obligatorio_vacio_se_rechaza(self):
        conn = FakeConnection()
        assert _guard(conn, {'layers': _layer_row()}, FIELDS['label'], '') is not None

    def test_campo_opcional_vacio_pasa(self):
        conn = FakeConnection()
        assert _guard(conn, {'layers': _layer_row()}, FIELDS['wms_group'], '') is None

    def test_geoserver_layer_sin_workspace_se_rechaza(self):
        conn = FakeConnection()
        states = {'layers': _layer_row(workspace_alias=None)}
        assert 'workspace' in _guard(conn, states, FIELDS['geoserver_layer'], 'hospitales')

    def test_geoserver_layer_con_workspace_desconocido_se_rechaza(self):
        conn = FakeConnection(workspace_row=None)
        states = {'layers': _layer_row()}
        assert 'tabla workspaces' in _guard(conn, states, FIELDS['geoserver_layer'], 'hospitales')

    def test_geoserver_layer_inexistente_se_rechaza(self, monkeypatch):
        monkeypatch.setattr(
            'app.services.grids.layer_config_grid._known_layers',
            lambda ws: frozenset({'clinicas'}),
        )
        monkeypatch.setattr(
            'app.services.grids.layer_config_grid._is_layer_group',
            lambda ws, name: False,
        )
        conn = FakeConnection(workspace_row={'geoserver_workspace': 'salud'})
        states = {'layers': _layer_row()}
        reason = _guard(conn, states, FIELDS['geoserver_layer'], 'hospitales')
        assert 'no existe en el workspace' in reason

    def test_geoserver_layer_existente_pasa(self, monkeypatch):
        monkeypatch.setattr(
            'app.services.grids.layer_config_grid._known_layers',
            lambda ws: frozenset({'hospitales'}),
        )
        conn = FakeConnection(workspace_row={'geoserver_workspace': 'salud'})
        states = {'layers': _layer_row()}
        assert _guard(conn, states, FIELDS['geoserver_layer'], 'hospitales') is None

    def test_geoserver_caido_no_bloquea(self, monkeypatch):
        monkeypatch.setattr(
            'app.services.grids.layer_config_grid._known_layers',
            lambda ws: None,
        )
        conn = FakeConnection(workspace_row={'geoserver_workspace': 'salud'})
        states = {'layers': _layer_row()}
        assert _guard(conn, states, FIELDS['geoserver_layer'], 'cualquiera') is None


class TestApplyCellChanges:
    def test_aplica_cambio_simple(self):
        conn = FakeConnection(row=_layer_row())
        result = apply_cell_changes(
            conn,
            SPEC,
            [CellChange('salud-hospitales', 'label', 'Hospitales', 'Hospitales publicos')],
            'quien@iieg.mx',
        )
        assert result['applied'] == 1
        updates = [sql for sql, _ in conn.statements if sql.startswith('UPDATE')]
        assert updates and 'updated_by' in updates[0]

    def test_search_tags_se_castea_a_text_array(self):
        conn = FakeConnection(row=_layer_row())
        result = apply_cell_changes(
            conn,
            SPEC,
            [CellChange('salud-hospitales', 'search_tags', None, 'salud, hospital')],
            None,
        )
        assert result['applied'] == 1
        update = next(
            (sql, params) for sql, params in conn.statements if sql.startswith('UPDATE')
        )
        assert 'CAST(:search_tags AS text[])' in update[0]
        assert update[1]['search_tags'] == '{"salud","hospital"}'

    def test_no_inserta_filas_nuevas(self):
        conn = FakeConnection(row=None)
        result = apply_cell_changes(
            conn,
            SPEC,
            [CellChange('no-existe', 'label', None, 'X')],
            None,
        )
        assert result['applied'] == 0
        assert result['conflicts'][0]['reason'] == 'row_missing'

    def test_valor_obsoleto_marca_conflicto(self):
        conn = FakeConnection(row=_layer_row())
        result = apply_cell_changes(
            conn,
            SPEC,
            [CellChange('salud-hospitales', 'label', 'Otro nombre', 'Nuevo')],
            None,
        )
        assert result['applied'] == 0
        assert result['conflicts'][0]['reason'] == 'stale'


def test_spec_notifica_al_visor():
    assert SPEC.on_commit is not None
    assert SPEC.key == 'layer-config'
    assert SPEC.row_key_field == 'id'
