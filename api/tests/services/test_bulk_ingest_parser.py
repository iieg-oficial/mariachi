import io

import pytest

from app.services.bulk_ingest_parser import (
    MAPALAB_EXCEL_PRESET,
    TECHNICAL_FIELDS,
    BulkIngestParseError,
    apply_mapping,
    parse_bool,
    parse_date_iso,
    parse_number_with_symbol,
    parse_source,
    unknown_targets,
)


def _csv_bytes(rows: list[list[str]]) -> bytes:
    out = io.StringIO()
    for row in rows:
        out.write(','.join(f'"{cell}"' for cell in row) + '\n')
    return out.getvalue().encode('utf-8-sig')


class TestParseSource:
    def test_csv_parses_headers_and_rows(self):
        content = _csv_bytes([
            ['Nombre de la capa en GeoServer', 'Descripción (número de caracteres recomendado 255-300)'],
            ['salud:unidades', 'Capa con unidades médicas'],
        ])
        headers, rows = parse_source('archivo.csv', content)
        assert headers == ['Nombre de la capa en GeoServer', 'Descripción (número de caracteres recomendado 255-300)']
        assert len(rows) == 1
        assert rows[0]['Nombre de la capa en GeoServer'] == 'salud:unidades'

    def test_unsupported_format_raises(self):
        with pytest.raises(BulkIngestParseError, match='Formato no soportado'):
            parse_source('archivo.txt', b'whatever')

    def test_empty_csv_returns_empty(self):
        headers, rows = parse_source('empty.csv', b'')
        assert rows == []


class TestParseBool:
    @pytest.mark.parametrize('value,expected', [
        ('Sí', True),
        ('sí', True),
        ('si', True),
        ('SI', True),
        ('1', True),
        ('true', True),
        ('No', False),
        ('NO', False),
        ('0', False),
        ('falso', False),
        ('', None),
        (None, None),
        ('maybe', None),
    ])
    def test_parses(self, value, expected):
        assert parse_bool(value) == expected


class TestApplyMapping:
    def test_basic_scalar_mapping(self):
        headers = ['gs_layer', 'descripcion']
        rows = [{'gs_layer': 'salud:unidades', 'descripcion': 'Una descripción'}]
        mapping = {'gs_layer': 'layer_key', 'descripcion': 'descripcion'}
        result = apply_mapping(headers, rows, mapping)
        assert len(result) == 1
        assert result[0]['layer_key'] == 'salud:unidades'
        assert result[0]['descripcion'] == 'Una descripción'
        assert result[0]['workspace'] == 'salud'

    def test_workspace_not_derived_when_no_colon(self):
        headers = ['gs_layer']
        rows = [{'gs_layer': 'flat_name'}]
        mapping = {'gs_layer': 'layer_key'}
        result = apply_mapping(headers, rows, mapping)
        assert 'workspace' not in result[0]

    def test_workspace_respects_explicit_mapping(self):
        headers = ['gs_layer', 'ws']
        rows = [{'gs_layer': 'salud:unidades', 'ws': 'custom'}]
        mapping = {'gs_layer': 'layer_key', 'ws': 'workspace'}
        result = apply_mapping(headers, rows, mapping)
        assert result[0]['workspace'] == 'custom'

    def test_builds_fuentes_jsonb(self):
        headers = ['k', 'corto', 'largo', 'enlace']
        rows = [{'k': 'a:b', 'corto': 'PDF', 'largo': 'Texto largo', 'enlace': 'https://ejemplo.com'}]
        mapping = {
            'k': 'layer_key',
            'corto': 'fuentes_corto',
            'largo': 'fuentes_largo',
            'enlace': 'fuentes_enlace',
        }
        result = apply_mapping(headers, rows, mapping)
        assert result[0]['fuentes'] == {
            'corto': 'PDF',
            'largo': 'Texto largo',
            'enlace': 'https://ejemplo.com',
        }

    def test_builds_metodologia_partial(self):
        headers = ['k', 'mt']
        rows = [{'k': 'a:b', 'mt': 'fórmula X'}]
        mapping = {'k': 'layer_key', 'mt': 'metodologia_texto'}
        result = apply_mapping(headers, rows, mapping)
        assert result[0]['metodologia'] == {'texto': 'fórmula X'}

    def test_builds_metadato_multiple_items(self):
        headers = ['k', 'm_txt', 'm_xlsx']
        rows = [{'k': 'a:b', 'm_txt': 'http://x/a.txt', 'm_xlsx': 'http://x/a.xlsx'}]
        mapping = {'k': 'layer_key', 'm_txt': 'metadato_txt', 'm_xlsx': 'metadato_xlsx'}
        result = apply_mapping(headers, rows, mapping)
        assert result[0]['metadato'] == [
            {'nombre': 'Metadato TXT', 'enlace': 'http://x/a.txt'},
            {'nombre': 'Metadato XLSX', 'enlace': 'http://x/a.xlsx'},
        ]

    def test_builds_numeralia_skipping_empty_positions(self):
        headers = ['k', 'n1_n', 'n1_v', 'n1_s', 'n3_v']
        rows = [{
            'k': 'a:b',
            'n1_n': 'Población',
            'n1_v': '1234',
            'n1_s': 'hab',
            'n3_v': '999',
        }]
        mapping = {
            'k': 'layer_key',
            'n1_n': 'numeralia_01_nombre',
            'n1_v': 'numeralia_01_valor',
            'n1_s': 'numeralia_01_simbolo',
            'n3_v': 'numeralia_03_valor',
        }
        result = apply_mapping(headers, rows, mapping)
        assert result[0]['values'] == [
            {'posicion': 1, 'valor': '1234', 'nombre': 'Población', 'simbolo': 'hab'},
            {'posicion': 3, 'valor': '999', 'nombre': None, 'simbolo': None},
        ]

    def test_includes_pie_numeralia(self):
        headers = ['k', 'pie']
        rows = [{'k': 'a:b', 'pie': 'Datos 2024'}]
        mapping = {'k': 'layer_key', 'pie': 'nombre_pie_numeralia'}
        result = apply_mapping(headers, rows, mapping)
        assert result[0]['pie_numeralia'] == 'Datos 2024'

    def test_ignores_unmapped_columns(self):
        headers = ['k', 'extra']
        rows = [{'k': 'a:b', 'extra': 'descartado'}]
        mapping = {'k': 'layer_key', 'extra': ''}
        result = apply_mapping(headers, rows, mapping)
        assert 'extra' not in result[0]

    def test_empty_cells_dont_emit_keys(self):
        headers = ['k', 'descripcion']
        rows = [{'k': 'a:b', 'descripcion': ''}]
        mapping = {'k': 'layer_key', 'descripcion': 'descripcion'}
        result = apply_mapping(headers, rows, mapping)
        assert 'descripcion' not in result[0]

    def test_downloadable_parses_to_bool(self):
        headers = ['k', 'desc']
        rows = [{'k': 'a:b', 'desc': 'Sí'}]
        mapping = {'k': 'layer_key', 'desc': 'downloadable'}
        result = apply_mapping(headers, rows, mapping)
        assert result[0]['downloadable'] is True


class TestMapalabExcelPreset:
    def test_preset_targets_are_all_valid(self):
        invalid = [t for t in MAPALAB_EXCEL_PRESET.values() if t and t not in TECHNICAL_FIELDS]
        assert invalid == [], f'Targets desconocidos en preset: {invalid}'

    def test_preset_maps_layer_key(self):
        assert 'layer_key' in MAPALAB_EXCEL_PRESET.values()

    def test_preset_maps_all_8_numeralias(self):
        targets = list(MAPALAB_EXCEL_PRESET.values())
        for i in range(1, 9):
            n = str(i).zfill(2)
            assert f'numeralia_{n}_nombre' in targets
            assert f'numeralia_{n}_valor' in targets
            assert f'numeralia_{n}_simbolo' in targets

    def test_preset_maps_pie_numeralia(self):
        assert 'nombre_pie_numeralia' in MAPALAB_EXCEL_PRESET.values()


class TestUnknownTargets:
    def test_detects_unknown(self):
        mapping = {'a': 'layer_key', 'b': 'not_a_real_field'}
        assert unknown_targets(mapping) == ['not_a_real_field']

    def test_ignores_empty(self):
        mapping = {'a': 'layer_key', 'b': ''}
        assert unknown_targets(mapping) == []


class TestParseDateIso:
    @pytest.mark.parametrize('value,expected', [
        ('2026-05-22', '2026-05-22'),
        ('2026-5-2', '2026-05-02'),
        ('2026-05-22T10:30:00', '2026-05-22'),
        ('2026-05', '2026-05-01'),
        ('2026/05', '2026-05-01'),
        ('2026', '2026-01-01'),
        ('22/05/2026', '2026-05-22'),
        ('22-05-2026', '2026-05-22'),
        ('22.05.2026', '2026-05-22'),
        ('05/05/26', '2026-05-05'),
        ('05/05/85', '1985-05-05'),
        ('22-may-2026', '2026-05-22'),
        ('22 Mayo 2026', '2026-05-22'),
        ('22/septiembre/2026', '2026-09-22'),
        ('Mayo 2026', '2026-05-01'),
        ('may-2026', '2026-05-01'),
        ('septiembre 2024', '2024-09-01'),
    ])
    def test_known_formats_normalize_to_iso(self, value, expected):
        assert parse_date_iso(value) == expected

    def test_invalid_date_passes_through(self):
        assert parse_date_iso('texto raro') == 'texto raro'

    def test_31_de_febrero_rejected_passthrough(self):
        assert parse_date_iso('31/02/2026') == '31/02/2026'

    def test_none_returns_none(self):
        assert parse_date_iso(None) is None
        assert parse_date_iso('') is None

    def test_trim_whitespace(self):
        assert parse_date_iso('  2026-05-22  ') == '2026-05-22'


class TestParseNumberWithSymbol:
    @pytest.mark.parametrize('value,expected_num,expected_sym', [
        ('1234', '1234', None),
        ('1,234', '1234', None),
        ('1,234,567', '1234567', None),
        ('1.234.567', '1234567', None),
        ('1,234.56', '1234.56', None),
        ('1.234,56', '1234.56', None),
        ('1 234 567', '1234567', None),
        ('1 234 567', '1234567', None),
        ('1.5', '1.5', None),
        ('1,5', '1.5', None),
        ('98.5%', '98.5', '%'),
        ('98,5%', '98.5', '%'),
        ('$45.50', '45.50', '$'),
        ('$ 1,234.50', '1234.50', '$'),
        ('-1234', '-1234', None),
        ('-1,234.50', '-1234.50', None),
    ])
    def test_known_numeric_formats(self, value, expected_num, expected_sym):
        num, sym = parse_number_with_symbol(value)
        assert num == expected_num
        assert sym == expected_sym

    def test_non_numeric_passes_through(self):
        num, sym = parse_number_with_symbol('N/A')
        assert num == 'N/A'
        assert sym is None

    def test_empty_returns_none(self):
        assert parse_number_with_symbol(None) == (None, None)
        assert parse_number_with_symbol('') == (None, None)


class TestApplyMappingIIEGStandard:
    def test_fecha_ultima_normalized_to_iso(self):
        rows = [{'Fecha': '22/05/2026', 'Capa': 'ws:layer'}]
        out = apply_mapping(['Fecha', 'Capa'], rows, {'Fecha': 'fecha_ultima', 'Capa': 'layer_key'})
        assert out[0]['fecha_ultima'] == '2026-05-22'

    def test_numeralia_extracts_symbol_when_not_mapped(self):
        rows = [{'Valor1': '98.5%', 'Capa': 'ws:layer'}]
        out = apply_mapping(
            ['Valor1', 'Capa'], rows,
            {'Valor1': 'numeralia_01_valor', 'Capa': 'layer_key'},
        )
        numeralia = out[0]['values']
        assert numeralia[0]['valor'] == '98.5'
        assert numeralia[0]['simbolo'] == '%'

    def test_numeralia_respects_explicit_symbol_mapping(self):
        rows = [{'Valor1': '98.5%', 'Simbolo1': 'pct', 'Capa': 'ws:layer'}]
        out = apply_mapping(
            ['Valor1', 'Simbolo1', 'Capa'], rows,
            {
                'Valor1': 'numeralia_01_valor',
                'Simbolo1': 'numeralia_01_simbolo',
                'Capa': 'layer_key',
            },
        )
        numeralia = out[0]['values']
        assert numeralia[0]['valor'] == '98.5'
        assert numeralia[0]['simbolo'] == 'pct'

    def test_numeralia_strips_thousands_separator(self):
        rows = [{'Valor1': '1,234,567', 'Capa': 'ws:layer'}]
        out = apply_mapping(
            ['Valor1', 'Capa'], rows,
            {'Valor1': 'numeralia_01_valor', 'Capa': 'layer_key'},
        )
        assert out[0]['values'][0]['valor'] == '1234567'
