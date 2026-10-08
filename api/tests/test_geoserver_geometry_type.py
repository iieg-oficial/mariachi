from unittest.mock import patch

from app.services.geoserver_client import GeoServerClient


def _cli() -> GeoServerClient:
    return GeoServerClient(base_url='http://geoserver.test/geoserver')


def _propiedades(*tipos):
    return [
        {'name': f'campo_{i}', 'localType': tipo}
        for i, tipo in enumerate(tipos)
    ]


@patch.object(GeoServerClient, 'is_coverage', return_value=False)
def test_multipolygon_es_poligono(_cobertura):
    cli = _cli()
    with patch.object(cli, '_describe_properties', return_value=_propiedades('string', 'MultiPolygon')):
        assert cli.geometry_type('mapa_base', 'municipios') == 'polygon'


@patch.object(GeoServerClient, 'is_coverage', return_value=False)
def test_multilinestring_es_linea(_cobertura):
    cli = _cli()
    with patch.object(cli, '_describe_properties', return_value=_propiedades('MultiLineString')):
        assert cli.geometry_type('agua', 'rios') == 'line'


@patch.object(GeoServerClient, 'is_coverage', return_value=False)
def test_point_y_multipoint_son_punto(_cobertura):
    cli = _cli()
    for tipo in ('Point', 'MultiPoint'):
        with patch.object(cli, '_describe_properties', return_value=_propiedades(tipo)):
            assert cli.geometry_type('salud', 'unidades') == 'point'


@patch.object(GeoServerClient, 'is_coverage', return_value=True)
def test_una_cobertura_es_raster(_cobertura):
    assert _cli().geometry_type('raster', 'nddi') == 'raster'


@patch.object(GeoServerClient, 'is_coverage', return_value=False)
def test_sin_columna_de_geometria_devuelve_none(_cobertura):
    cli = _cli()
    with patch.object(cli, '_describe_properties', return_value=_propiedades('string', 'int')):
        assert cli.geometry_type('economia', 'tabla_plana') is None


@patch.object(GeoServerClient, 'is_coverage', return_value=False)
def test_un_tipo_desconocido_no_inventa_geometria(_cobertura):
    cli = _cli()
    with patch.object(cli, '_describe_properties', return_value=_propiedades('GeometryCollection')):
        assert cli.geometry_type('mapa_base', 'mixta') is None


@patch.object(GeoServerClient, 'is_layer_group', return_value=False)
def test_list_fields_sigue_normalizando(_grupo):
    cli = _cli()
    with patch.object(cli, '_describe_properties', return_value=_propiedades('MultiPolygon', 'int')):
        assert cli.list_fields('mapa_base', 'municipios') == [
            {'name': 'campo_0', 'type': 'geometry'},
            {'name': 'campo_1', 'type': 'integer'},
        ]
