from unittest.mock import MagicMock, patch

from app.services.geoserver_client import GeoServerClient


def _cli() -> GeoServerClient:
    return GeoServerClient(base_url='http://geoserver.test/geoserver')


def _cliente(status: int, payload: dict | None = None) -> MagicMock:
    respuesta = MagicMock(status_code=status)
    respuesta.json.return_value = payload or {}
    ctx = MagicMock()
    ctx.__enter__.return_value.get.return_value = respuesta
    ctx.__exit__.return_value = False
    return ctx


def test_un_raster_devuelve_sus_bandas_con_el_nombre_de_geoserver():
    bandas = {'coverageDimension': [{'name': 'Label_Gray_Index'}, {'name': 'ALPHA_BAND'}]}
    payload = {'coverage': {'dimensions': bandas}}
    cli = _cli()
    with patch.object(cli, '_client', return_value=_cliente(200, payload)):
        salida = cli.list_fields('raster', 'elevacion')
    assert salida == [
        {'name': 'Label_Gray_Index', 'type': 'number'},
        {'name': 'ALPHA_BAND', 'type': 'number'},
    ]


def test_una_sola_banda_llega_como_objeto():
    payload = {'coverage': {'dimensions': {'coverageDimension': {'name': 'GRAY_INDEX'}}}}
    cli = _cli()
    with patch.object(cli, '_client', return_value=_cliente(200, payload)):
        assert cli.list_fields('raster', 'elevacion') == [{'name': 'GRAY_INDEX', 'type': 'number'}]


def test_una_capa_vectorial_sigue_leyendo_el_esquema():
    cli = _cli()
    propiedades = [{'name': 'nombre', 'localType': 'string'}]
    with patch.object(cli, '_client', return_value=_cliente(404)):
        with patch.object(cli, '_describe_properties', return_value=propiedades):
            assert cli.list_fields('educacion', 'centros') == [{'name': 'nombre', 'type': 'string'}]
