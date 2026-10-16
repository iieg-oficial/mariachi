from types import SimpleNamespace

import pytest

from app.api.routes import mapalab_mcp_internal
from app.models.mapalab_mcp_event import MapalabMcpEvent
from app.schemas.mapalab_mcp import MapalabMcpEventItem
from tests.conftest import ADMIN_PREFIX

URL = f"{ADMIN_PREFIX}/internal/mapalab/mcp/events"
TOKEN = {"X-Internal-Token": "secreto"}


@pytest.fixture
def token_interno(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        mapalab_mcp_internal,
        "get_settings",
        lambda: SimpleNamespace(mapalab_internal_token="secreto"),
    )


def _evento(**extra: object) -> dict:
    base = {
        "timestamp": "2026-10-16T12:00:00",
        "method": "tools/call",
        "tool": "layer_stats",
        "status": "ok",
        "durationMs": 12,
        "sessionHash": None,
        "ipHash": None,
        "clientName": "claude-ai",
        "clientVersion": "1.0",
    }
    return {**base, **extra}


def test_textos_largos_se_truncan_en_vez_de_rechazar() -> None:
    item = MapalabMcpEventItem.model_validate(
        _evento(clientName="c" * 200, method="m" * 90, tool="t" * 100, clientVersion="v" * 50, status="s" * 30)
    )
    assert len(item.client_name) == 80
    assert len(item.method) == 40
    assert len(item.tool) == 80
    assert len(item.client_version) == 40
    assert len(item.status) == 20


def test_nulos_y_numeros_no_cambian() -> None:
    item = MapalabMcpEventItem.model_validate(_evento(tool=None, clientName=None))
    assert item.tool is None
    assert item.client_name is None
    assert item.duration_ms == 12


def test_lote_con_texto_largo_se_guarda_completo(client, db_session, token_interno) -> None:
    items = [_evento(), _evento(clientName="x" * 300)]
    res = client.post(URL, json={"items": items}, headers=TOKEN)
    assert res.status_code == 200, res.text
    assert res.json() == {"ok": True, "inserts": 2}
    nombres = sorted(e.client_name for e in db_session.query(MapalabMcpEvent).all())
    assert nombres == ["claude-ai", "x" * 80]
