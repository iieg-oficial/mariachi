from unittest.mock import MagicMock, patch

import pytest

from app.services.geoserver_client import GeoServerClient, GeoServerError


def _cli() -> GeoServerClient:
    return GeoServerClient(base_url='http://geoserver.test/geoserver')


def _respuesta(payload):
    r = MagicMock()
    r.json.return_value = payload
    r.raise_for_status.return_value = None
    return r


def _cliente(payload):
    ctx = MagicMock()
    ctx.__enter__.return_value.get.return_value = _respuesta(payload)
    ctx.__exit__.return_value = False
    return ctx


@patch.object(GeoServerClient, 'is_layer_group', return_value=False)
def test_devuelve_id_y_propiedades_planas(_grupo):
    payload = {'features': [{
        'id': 'capa.1',
        'properties': {'nombre': 'Escuela', 'alumnos': 320, 'geom': {'type': 'Point'}, 'tags': ['a']},
    }]}
    cli = _cli()
    with patch.object(cli, '_client', return_value=_cliente(payload)):
        salida = cli.sample_features('educacion', 'centros', 5)
    assert salida == [{'id': 'capa.1', 'properties': {'nombre': 'Escuela', 'alumnos': 320}}]


@patch.object(GeoServerClient, 'is_layer_group', return_value=True)
def test_un_grupo_de_capas_no_tiene_features(_grupo):
    assert _cli().sample_features('mapa_base', 'grupo') == []


@patch.object(GeoServerClient, 'is_layer_group', return_value=False)
def test_el_limite_se_acota_entre_1_y_50(_grupo):
    cli = _cli()
    ctx = _cliente({'features': []})
    with patch.object(cli, '_client', return_value=ctx):
        cli.sample_features('educacion', 'centros', 999)
    enviados = ctx.__enter__.return_value.get.call_args.kwargs['params']
    assert enviados['count'] == '50'


@patch.object(GeoServerClient, 'is_layer_group', return_value=False)
def test_respuesta_no_json_se_reporta(_grupo):
    r = MagicMock()
    r.raise_for_status.return_value = None
    r.json.side_effect = ValueError('no json')
    ctx = MagicMock()
    ctx.__enter__.return_value.get.return_value = r
    ctx.__exit__.return_value = False
    cli = _cli()
    with patch.object(cli, '_client', return_value=ctx):
        with pytest.raises(GeoServerError, match='no-JSON'):
            cli.sample_features('educacion', 'centros')
