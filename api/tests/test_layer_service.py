import pytest

from app.services.layer_service import (
    CARACTERISTICA_STYLE,
    INFOBOX_TEMPLATES,
    MUNICIPIO_STYLE,
    resolve_infobox,
)


class TestResolveInfobox:
    def test_none_template_returns_params_as_is(self):
        params = {'headerField': 'foo'}
        assert resolve_infobox(None, params) == params

    def test_none_template_with_none_params(self):
        assert resolve_infobox(None, None) is None

    def test_custom_returns_params_as_is(self):
        params = {'arbitrary': 'json', 'nested': {'x': 1}}
        assert resolve_infobox('custom', params) == params

    def test_invalid_template_raises(self):
        with pytest.raises(ValueError, match='infobox_template invalido'):
            resolve_infobox('not_a_preset', {})

    def test_all_template_names_are_recognized(self):
        expected = {
            'municipio', 'punto', 'punto_municipio',
            'punto_ubicacion', 'punto_completo', 'custom',
        }
        assert INFOBOX_TEMPLATES == expected

    def test_municipio_basic(self):
        result = resolve_infobox('municipio', {
            'title': 'Homicidios',
            'text': 'Tasa por 100k hab',
            'stats': [
                {'label': 'Tasa', 'field': 'tasa'},
                {'label': 'Carpetas', 'field': 'carpetas'},
            ],
        })
        assert result['headerField'] == 'Homicidios'
        assert result['cards'] == [
            {'label': 'Tasa', 'field': 'tasa'},
            {'label': 'Carpetas', 'field': 'carpetas'},
        ]
        assert result['text'] == [{'label': 'Tasa por 100k hab'}]
        assert result['cardsColumns'] == 1
        assert MUNICIPIO_STYLE.items() <= result['labelGroups'][0].items()

    def test_municipio_without_text(self):
        result = resolve_infobox('municipio', {'title': 'X', 'stats': []})
        assert result['text'] is None
        assert result['cards'] == []

    def test_municipio_custom_columns(self):
        result = resolve_infobox('municipio', {'title': 'X', 'columns': 2})
        assert result['cardsColumns'] == 2

    def test_punto_simple(self):
        result = resolve_infobox('punto', {
            'title': 'nombre',
            'caracteristica': 'tipo_establecimiento',
        })
        assert result['headerField'] == 'nombre'
        lg = result['labelGroups'][0]
        assert lg['fields'] == ['tipo_establecimiento']
        assert CARACTERISTICA_STYLE.items() <= lg.items()

    def test_punto_municipio_has_two_badges(self):
        result = resolve_infobox('punto_municipio', {
            'title': 'nombre',
            'municipio': 'ciudad',
            'caracteristica': 'tipo',
        })
        assert len(result['labelGroups']) == 2
        assert MUNICIPIO_STYLE.items() <= result['labelGroups'][0].items()
        assert CARACTERISTICA_STYLE.items() <= result['labelGroups'][1].items()

    def test_punto_ubicacion_with_multiple_caracteristicas(self):
        result = resolve_infobox('punto_ubicacion', {
            'title': 'nombre',
            'municipio': 'municipio',
            'caracteristicas': ['tipo', 'subtipo'],
            'list': [{'label': 'Clave', 'field': 'clave'}],
            'iconTexts': [{'icon': 'phone', 'field': 'telefono'}],
        })
        assert len(result['labelGroups']) == 3
        assert result['list'] == [{'label': 'Clave', 'field': 'clave'}]
        assert result['iconText'] == [{'icon': 'phone', 'field': 'telefono'}]

    def test_punto_completo_full(self):
        result = resolve_infobox('punto_completo', {
            'title': 'escuela',
            'municipio': 'mun',
            'caracteristicas': ['nivel'],
            'list': [{'label': 'CCT', 'field': 'cct'}],
            'iconTexts': [],
            'stats': [{'label': 'Alumnos', 'field': 'alumnos'}],
            'text': 'Detalles',
        })
        assert result['stats'] == [{'label': 'Alumnos', 'field': 'alumnos'}]
        assert result['text'] == [{'label': 'Detalles'}]

    def test_punto_completo_without_optional_fields(self):
        result = resolve_infobox('punto_completo', {'title': 'x'})
        assert result['list'] == []
        assert result['iconText'] == []
        assert result['stats'] == []
        assert result['text'] is None

    def test_municipio_uses_defaults_when_params_missing(self):
        result = resolve_infobox('municipio', {})
        assert result['headerField'] == 'nombre'
        assert result['labelGroups'][0]['fields'] == ['nombre']
