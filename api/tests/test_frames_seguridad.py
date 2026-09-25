from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.api.deps import get_current_user, require_permission
from app.api.routes import frames
from app.core.database import get_db
from app.core.security import crear_csrf_token
from app.schemas.frames import CamaraResponse
from app.services import frames_config
from app.services.grids import frames_camaras_grid

URL = "rtsp://admin:S3creta@10.0.0.5:554/Streaming/Channels/101"


@pytest.mark.parametrize(
    ("url", "visible"),
    [
        (URL, "rtsp://****:****@10.0.0.5:554/Streaming/Channels/101"),
        (
            "rtsp://admin:{FRIGATE_CAMERA_PASSWORD}@10.0.0.5:554/x",
            "rtsp://****:{FRIGATE_CAMERA_PASSWORD}@10.0.0.5:554/x",
        ),
        ("rtsp://10.0.0.5:554/x", "rtsp://10.0.0.5:554/x"),
    ],
)
def test_enmascara_credenciales_rtsp(url, visible):
    assert frames_config.enmascarar_rtsp(url) == visible


def test_editar_con_la_url_enmascarada_conserva_la_credencial():
    nueva = "rtsp://****:****@10.0.0.9:554/Streaming/Channels/102"
    assert (
        frames_config.conservar_credenciales(nueva, URL)
        == "rtsp://admin:S3creta@10.0.0.9:554/Streaming/Channels/102"
    )
    assert frames_config.conservar_credenciales("rtsp://otro:clave@h/x", URL) == "rtsp://otro:clave@h/x"


def test_la_respuesta_de_camara_no_trae_la_contrasena():
    ahora = datetime.now(timezone.utc)
    camara = SimpleNamespace(
        id=1,
        nombre="canal_01",
        etiqueta="Canal 1",
        ubicacion=None,
        rtsp_url=URL,
        habilitada=True,
        grabacion_habilitada=True,
        retencion_dias=7,
        deteccion_habilitada=False,
        orden=0,
        created_at=ahora,
        updated_at=ahora,
    )
    datos = CamaraResponse.model_validate(camara).model_dump()
    assert "S3creta" not in datos["rtsp_url"]


def test_el_grid_de_camaras_no_expone_ni_edita_la_url():
    campo = frames_camaras_grid.FIELDS["rtsp_url"]
    assert campo.editable is False
    assert "S3creta" not in campo.read({"rtsp_url": URL})


def test_la_config_pide_credencial_al_restream(monkeypatch):
    monkeypatch.setattr(frames_config, "camaras_activas", lambda db: [])
    monkeypatch.setattr(
        frames_config, "get_settings", lambda: SimpleNamespace(frames_rtsp_username="visor")
    )
    configuracion = frames_config.construir(None)
    assert configuracion["go2rtc"] == {
        "rtsp": {"username": "visor", "password": "{FRIGATE_RTSP_PASSWORD}"}
    }


def test_sin_usuario_de_restream_no_se_genera_config(monkeypatch):
    monkeypatch.setattr(frames_config, "camaras_activas", lambda db: [])
    monkeypatch.setattr(
        frames_config, "get_settings", lambda: SimpleNamespace(frames_rtsp_username=None)
    )
    with pytest.raises(frames_config.FramesConfigError):
        frames_config.construir(None)


@pytest.fixture
def cliente_frames():
    usuario = SimpleNamespace(id=1, username="vista", permissions={"mariachi.frames.view"})
    app = FastAPI()
    app.include_router(
        frames.router, dependencies=[Depends(require_permission("mariachi.frames.view"))]
    )

    async def usuario_actual():
        return usuario

    def sin_db():
        yield None

    app.dependency_overrides[get_current_user] = usuario_actual
    app.dependency_overrides[get_db] = sin_db
    with TestClient(app) as cliente:
        yield cliente, crear_csrf_token(usuario.username)


@pytest.mark.parametrize(
    ("metodo", "ruta"),
    [
        ("post", "/frames/camaras"),
        ("put", "/frames/camaras/1"),
        ("delete", "/frames/camaras/1"),
        ("post", "/frames/aplicar"),
    ],
)
def test_frames_view_no_administra_camaras(cliente_frames, metodo, ruta):
    cliente, csrf = cliente_frames
    respuesta = cliente.request(metodo.upper(), ruta, json={}, headers={"X-CSRF-Token": csrf})
    assert respuesta.status_code == 403
    assert "mariachi.frames.manage" in respuesta.json()["detail"]
