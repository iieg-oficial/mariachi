"""Tests de los validators de schemas de layer_metadata.

Cubren la normalizacion al estandar IIEG (ISO 8601 para fechas, valor crudo +
simbolo aparte para numeralia) cuando entran datos por el editor manual
(`PUT /layer-metadata/{layer_key}` y `PUT /layer-metadata/{layer_key}/stats`).
"""
from app.schemas.layer_metadata import (
    LayerMetadataUpdate,
    LayerStatsUpdate,
    NumeraliaValueInput,
)


class TestLayerMetadataUpdateFechaUltima:
    def test_fecha_ddmmyyyy_normalized_to_iso(self):
        m = LayerMetadataUpdate(fecha_ultima='22/05/2026')
        assert m.fecha_ultima == '2026-05-22'

    def test_fecha_mes_year_normalized_to_iso(self):
        m = LayerMetadataUpdate(fecha_ultima='Mayo 2026')
        assert m.fecha_ultima == '2026-05-01'

    def test_fecha_iso_passthrough(self):
        m = LayerMetadataUpdate(fecha_ultima='2026-05-22')
        assert m.fecha_ultima == '2026-05-22'

    def test_fecha_none_preserved(self):
        m = LayerMetadataUpdate(fecha_ultima=None)
        assert m.fecha_ultima is None

    def test_fecha_invalida_se_preserva(self):
        m = LayerMetadataUpdate(fecha_ultima='texto raro')
        assert m.fecha_ultima == 'texto raro'


class TestNumeraliaValueInput:
    def test_valor_normaliza_separadores(self):
        n = NumeraliaValueInput(posicion=1, valor='1,234,567')
        assert n.valor == '1234567'
        assert n.simbolo is None

    def test_valor_extrae_simbolo_porcentaje(self):
        n = NumeraliaValueInput(posicion=1, valor='98.5%')
        assert n.valor == '98.5'
        assert n.simbolo == '%'

    def test_valor_respeta_simbolo_explicito(self):
        n = NumeraliaValueInput(posicion=1, valor='98.5%', simbolo='pct')
        assert n.valor == '98.5'
        assert n.simbolo == 'pct'

    def test_valor_no_numerico_passthrough(self):
        n = NumeraliaValueInput(posicion=1, valor='N/A')
        assert n.valor == 'N/A'
        assert n.simbolo is None

    def test_layer_stats_update_aplica_a_lista(self):
        stats = LayerStatsUpdate(values=[
            {'posicion': 1, 'valor': '1,234.50'},
            {'posicion': 2, 'valor': '15%'},
        ])
        assert stats.values[0].valor == '1234.50'
        assert stats.values[1].valor == '15'
        assert stats.values[1].simbolo == '%'
