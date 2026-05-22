"""Tests del planner enfocados en comparacion semantica.

Cubren el caso donde la BD tiene un valor en formato legacy y el upload trae
el mismo valor en formato IIEG (ISO 8601 / numerico crudo); el planner no
debe marcar diff, asi evitamos UPDATEs espurios.
"""
from app.services.bulk_ingest_planner import _normalize_for_compare


class TestNormalizeForCompareSemantic:
    def test_fecha_ultima_diff_formats_iguales(self):
        assert _normalize_for_compare('fecha_ultima', '31/12/2023') == \
               _normalize_for_compare('fecha_ultima', '2023-12-31')

    def test_fecha_ultima_diff_real(self):
        assert _normalize_for_compare('fecha_ultima', '31/12/2023') != \
               _normalize_for_compare('fecha_ultima', '2024-01-01')

    def test_fecha_ultima_mes_anio_iguales(self):
        assert _normalize_for_compare('fecha_ultima', 'Mayo 2026') == \
               _normalize_for_compare('fecha_ultima', '2026-05-01')

    def test_fecha_ultima_invalida_passthrough(self):
        assert _normalize_for_compare('fecha_ultima', 'texto raro') == 'texto raro'

    def test_values_numeralia_diff_formats_iguales(self):
        old = [{'posicion': 1, 'valor': '1,234.50', 'nombre': 'Mun.', 'simbolo': ''}]
        new = [{'posicion': 1, 'valor': '1234.50', 'nombre': 'Mun.'}]
        assert _normalize_for_compare('values', old) == _normalize_for_compare('values', new)

    def test_values_numeralia_diff_real(self):
        old = [{'posicion': 1, 'valor': '100', 'nombre': 'Mun.'}]
        new = [{'posicion': 1, 'valor': '200', 'nombre': 'Mun.'}]
        assert _normalize_for_compare('values', old) != _normalize_for_compare('values', new)

    def test_values_with_symbol_preserves_diff(self):
        old = [{'posicion': 1, 'valor': '98.5', 'simbolo': '%'}]
        new = [{'posicion': 1, 'valor': '98.5', 'simbolo': ''}]
        assert _normalize_for_compare('values', old) != _normalize_for_compare('values', new)

    def test_otros_campos_text_exact(self):
        assert _normalize_for_compare('descripcion', 'hola') == 'hola'
        assert _normalize_for_compare('descripcion', 'hola') != _normalize_for_compare('descripcion', 'HOLA')

    def test_jsonb_dict_canonicalizado(self):
        a = {'b': 1, 'a': 2}
        b = {'a': 2, 'b': 1}
        assert _normalize_for_compare('fuentes', a) == _normalize_for_compare('fuentes', b)
