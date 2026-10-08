from unittest.mock import MagicMock, patch

import pytest

from app.services.geoserver_client import GeoServerClient, GeoServerError, _parse_hits

HITS = (
    '<wfs:FeatureCollection xmlns:wfs="http://www.opengis.net/wfs/2.0" '
    'numberMatched="1204" numberReturned="0" timeStamp="2026-09-24T10:00:00Z"/>'
)
EXCEPCION = (
    '<ows:ExceptionReport xmlns:ows="http://www.opengis.net/ows/1.1" version="2.0.0">'
    '<ows:Exception exceptionCode="InvalidParameterValue">'
    '<ows:ExceptionText>Could not parse CQL filter list.</ows:ExceptionText>'
    '</ows:Exception></ows:ExceptionReport>'
)


def test_lee_el_total_de_numbermatched():
    assert _parse_hits(200, HITS, 'economia:cultivos') == 1204


def test_un_filtro_invalido_trae_el_texto_de_geoserver():
    with pytest.raises(GeoServerError, match='Could not parse CQL filter'):
        _parse_hits(400, EXCEPCION, 'economia:cultivos')


def test_la_excepcion_gana_aunque_llegue_con_200():
    with pytest.raises(GeoServerError, match='Could not parse CQL filter'):
        _parse_hits(200, EXCEPCION, 'economia:cultivos')


def test_sin_numbermatched_no_inventa_un_cero():
    sin_total = '<wfs:FeatureCollection xmlns:wfs="http://www.opengis.net/wfs/2.0"/>'
    with pytest.raises(GeoServerError, match='no informo el total'):
        _parse_hits(200, sin_total, 'economia:cultivos')


def test_una_respuesta_que_no_es_xml_es_error_claro():
    with pytest.raises(GeoServerError, match='ilegible'):
        _parse_hits(502, '<html>Bad Gateway', 'economia:cultivos')


def test_el_filtro_viaja_como_cql_filter_y_se_recorta():
    cli = GeoServerClient(base_url='http://geoserver.test/geoserver')
    respuesta = MagicMock(status_code=200, text=HITS)
    ctx = MagicMock()
    ctx.__enter__.return_value.get.return_value = respuesta
    ctx.__exit__.return_value = False
    with patch.object(cli, '_client', return_value=ctx):
        total = cli.count_features('economia', 'cultivos', "  cultivo = 'Aguacate'  ")
    params = ctx.__enter__.return_value.get.call_args.kwargs['params']
    assert total == 1204
    assert params['resultType'] == 'hits'
    assert params['CQL_FILTER'] == "cultivo = 'Aguacate'"


def test_sin_filtro_no_manda_cql_filter():
    cli = GeoServerClient(base_url='http://geoserver.test/geoserver')
    respuesta = MagicMock(status_code=200, text=HITS)
    ctx = MagicMock()
    ctx.__enter__.return_value.get.return_value = respuesta
    ctx.__exit__.return_value = False
    with patch.object(cli, '_client', return_value=ctx):
        cli.count_features('economia', 'cultivos', '   ')
    assert 'CQL_FILTER' not in ctx.__enter__.return_value.get.call_args.kwargs['params']


def test_las_entidades_del_mensaje_se_decodifican():
    doble = EXCEPCION.replace('Could not parse CQL filter list.', 'Encountered &amp;quot;no&amp;quot; at line 1')
    with pytest.raises(GeoServerError, match='Encountered "no" at line 1'):
        _parse_hits(400, doble, 'economia:cultivos')
