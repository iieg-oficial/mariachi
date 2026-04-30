from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from app.models.borrador import Borrador
from app.services import borrador_service
from app.services.geoserver_client import GeoServerError
from app.services.sld_parser import parse_sld

FIXTURES_DIR = Path(__file__).resolve().parents[1] / "fixtures" / "slds"


@pytest.fixture
def pobreza_extrema_model() -> dict:
    xml = (FIXTURES_DIR / "pobreza_extrema.sld").read_text(encoding="utf-8")
    parsed = parse_sld(xml)
    assert parsed.editable
    return parsed.model.model_dump()


def _build_borrador(resource_id: str, data: dict) -> Borrador:
    b = Borrador(
        resource_type='sld',
        resource_id=resource_id,
        usuario_id=1,
        data=data,
        estado='pendiente_revision',
    )
    return b


def _mock_workspace_query(alias: str, geoserver_workspace: str):
    fake_ws = MagicMock(alias=alias, geoserver_workspace=geoserver_workspace)
    session = MagicMock()
    session.query.return_value.filter.return_value.first.return_value = fake_ws
    return session


class TestApplySld:
    def test_invalid_resource_id_format(self, pobreza_extrema_model):
        b = _build_borrador('sin_dos_puntos', pobreza_extrema_model)
        with pytest.raises(HTTPException) as exc:
            borrador_service.apply_borrador(None, None, b, 'admin@example.com')
        assert exc.value.status_code == 400
        assert 'resource_id' in exc.value.detail

    def test_missing_required_fields(self):
        b = _build_borrador('seguridad:foo', {'layer_name': 'foo'})
        with pytest.raises(HTTPException) as exc:
            borrador_service.apply_borrador(None, None, b, 'admin@example.com')
        assert exc.value.status_code == 400
        assert 'Faltan campos' in exc.value.detail

    def test_apply_calls_put_sld_and_notifies(self, pobreza_extrema_model):
        b = _build_borrador('seguridad:pobreza_extrema', pobreza_extrema_model)
        ws_query = _mock_workspace_query('seguridad', 'seguridad_y_proteccion_ciudadana')
        with patch.object(borrador_service, 'GeoServerClient') as MockClient, \
                patch.object(borrador_service, 'notify_tree_changed') as mock_notify:
            instance = MockClient.return_value
            instance.put_sld.return_value = 'fakehash123'

            result = borrador_service.apply_borrador(
                None, ws_query, b, 'admin@example.com',
            )

            assert instance.put_sld.called
            args = instance.put_sld.call_args.args
            workspace, style_name, xml = args
            assert workspace == 'seguridad_y_proteccion_ciudadana'
            assert style_name == 'pobreza_extrema'
            assert '<sld:StyledLayerDescriptor' in xml
            assert mock_notify.called
            assert result == {
                'workspace': 'seguridad_y_proteccion_ciudadana',
                'style_name': 'pobreza_extrema',
                'sha256': 'fakehash123',
            }

    def test_geoserver_error_returns_502(self, pobreza_extrema_model):
        b = _build_borrador('seguridad:pobreza_extrema', pobreza_extrema_model)
        ws_query = _mock_workspace_query('seguridad', 'seguridad_y_proteccion_ciudadana')
        with patch.object(borrador_service, 'GeoServerClient') as MockClient:
            instance = MockClient.return_value
            instance.put_sld.side_effect = GeoServerError(
                'Verificación SHA256 falló'
            )
            with pytest.raises(HTTPException) as exc:
                borrador_service.apply_borrador(None, ws_query, b, 'admin@example.com')
            assert exc.value.status_code == 502
            assert 'SHA256' in exc.value.detail

    def test_invalid_model_returns_400(self):
        b = _build_borrador('seguridad:foo', {
            'layer_name': 'foo',
            'attribute': 'tasa',
            'cortes': [0, 1, 2],
            'labels': ['solo uno'],
            'colors': ['#FFF'],
        })
        with pytest.raises(HTTPException) as exc:
            borrador_service.apply_borrador(None, None, b, 'admin@example.com')
        assert exc.value.status_code == 400
        assert 'Modelo SLD inválido' in exc.value.detail


class TestPutSldClientLogic:
    def test_put_sld_creates_style_when_missing(self):
        from app.services.geoserver_client import GeoServerClient

        with patch.object(GeoServerClient, '__init__', return_value=None):
            client = GeoServerClient()
            client._base_url = 'http://gs'
            client._auth = ('u', 'p')
            client._timeout = 5.0

            with patch.object(client, 'style_exists', return_value=False) as mock_exists, \
                    patch.object(client, 'create_style_entry') as mock_create, \
                    patch.object(client, 'get_sld') as mock_get, \
                    patch('httpx.Client') as MockHttpx:

                xml = '<sld:StyledLayerDescriptor xmlns:sld="http://www.opengis.net/sld"/>'
                mock_get.return_value = xml

                put_response = MockHttpx.return_value.__enter__.return_value.put
                put_response.return_value.status_code = 200

                sha = client.put_sld('seguridad', 'foo', xml)

                mock_exists.assert_called_once_with('seguridad', 'foo')
                mock_create.assert_called_once_with('seguridad', 'foo')
                assert len(sha) == 64

    def test_put_sld_hash_mismatch_raises(self):
        from app.services.geoserver_client import GeoServerClient

        with patch.object(GeoServerClient, '__init__', return_value=None):
            client = GeoServerClient()
            client._base_url = 'http://gs'
            client._auth = ('u', 'p')
            client._timeout = 5.0

            with patch.object(client, 'style_exists', return_value=True), \
                    patch.object(client, 'get_sld', return_value='<different/>'), \
                    patch('httpx.Client') as MockHttpx:

                put_response = MockHttpx.return_value.__enter__.return_value.put
                put_response.return_value.status_code = 200

                with pytest.raises(GeoServerError, match='SHA256'):
                    client.put_sld('seguridad', 'foo', '<original/>')
