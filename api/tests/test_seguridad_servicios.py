from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.api.rate_limit import _client_ip
from app.api.routes import mapalab_api_keys_internal
from app.core.settings import Settings
from app.services import acervo_upload_clients, colibri_router_engine, stats_templates
from tests.test_stats_templates import _HealingConn

WORKSPACES = frozenset({"salud", "demografia"})


def _stat(schema: str, position: int = 1) -> dict:
    return {
        "operation": "count",
        "schema": schema,
        "table": "t",
        "position": position,
        "label": f"stat {position}",
    }


def test_validar_schemas_rechaza_lo_que_no_es_de_un_workspace():
    stats_templates.validar_schemas([_stat("salud")], WORKSPACES)
    with pytest.raises(stats_templates.StatsTemplateError, match="pg_catalog"):
        stats_templates.validar_schemas([_stat("pg_catalog")], WORKSPACES)


def test_validar_schemas_revisa_dentro_de_las_formulas():
    formula = {
        "operation": "formula",
        "position": 1,
        "expression": {"op": "div", "left": _stat("salud"), "right": _stat("mapalab")},
    }
    with pytest.raises(stats_templates.StatsTemplateError, match="mapalab"):
        stats_templates.validar_schemas([formula], WORKSPACES)


def test_el_lote_no_ejecuta_schemas_ajenos():
    conn = _HealingConn([7])
    values, errors = stats_templates.execute_stats_batch(
        conn, [_stat("mapalab", 1), _stat("salud", 2)], schemas=WORKSPACES
    )
    assert [e["position"] for e in errors] == [1]
    assert values[0]["posicion"] == 2


def test_el_lote_no_devuelve_el_error_crudo_de_la_base():
    conn = _HealingConn([RuntimeError('relation "salud.secreta" does not exist'), 1])
    _, errors = stats_templates.execute_stats_batch(conn, [_stat("salud", 1), _stat("salud", 2)])
    assert errors[0]["error"] == stats_templates.ERROR_DE_CALCULO


@pytest.fixture
def envios(monkeypatch):
    enviados: list[tuple[str, dict]] = []

    class ClienteFalso:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def post(self, url, json=None, headers=None):
            enviados.append((url, json))

    monkeypatch.setattr(colibri_router_engine.httpx, "Client", ClienteFalso)
    return enviados


PAYLOAD = {
    "id": 1,
    "tipo_label": "Error",
    "source_app": "mapalab",
    "source_route": "/<!here>",
    "mensaje": "hola <!channel> @everyone <https://x|clic>",
}


def test_discord_no_permite_menciones(envios):
    colibri_router_engine._dispatch_discord("https://discord.test/hook", PAYLOAD)
    assert envios[0][1]["allowed_mentions"] == {"parse": []}


def test_slack_neutraliza_menciones_masivas(envios):
    colibri_router_engine._dispatch_slack("https://hooks.slack.test/x", PAYLOAD)
    texto = envios[0][1]["text"]
    assert "<!channel>" not in texto
    assert "<!here>" not in texto
    assert "@everyone" not in texto
    assert "&lt;!channel&gt;" in texto


def test_webhook_sin_https_no_sale(envios, caplog):
    colibri_router_engine._dispatch_webhook_generico("http://interno:8080/secreto?token=abc", {})
    assert envios == []
    assert "token=abc" not in caplog.text


def test_tokens_internos_se_comparan_sin_filtrar(monkeypatch):
    monkeypatch.setattr(
        mapalab_api_keys_internal,
        "get_settings",
        lambda: SimpleNamespace(mapalab_internal_token="correcto"),
    )
    mapalab_api_keys_internal._require_internal_token("correcto")
    with pytest.raises(HTTPException) as exc:
        mapalab_api_keys_internal._require_internal_token("incorrecto")
    assert exc.value.status_code == 401

    monkeypatch.setattr(
        acervo_upload_clients,
        "get_settings",
        lambda: SimpleNamespace(acervo_internal_token="correcto"),
    )
    assert acervo_upload_clients.resolve_upload_client("correcto").client == "portal"
    with pytest.raises(HTTPException):
        acervo_upload_clients.resolve_upload_client("correct")


def test_la_ip_del_cliente_no_sale_de_x_forwarded_for():
    peticion = SimpleNamespace(
        headers={"x-forwarded-for": "1.2.3.4, 10.0.0.1"}, client=SimpleNamespace(host="172.19.0.5")
    )
    assert _client_ip(peticion) == "172.19.0.5"


def test_la_contrasena_de_redis_entra_en_la_url():
    ajustes = Settings(redis_url="redis://redis:6379/0", redis_password="a b/c")
    assert ajustes.redis_url == "redis://:a%20b%2Fc@redis:6379/0"
    assert Settings(redis_url="redis://redis:6379/0").redis_url == "redis://redis:6379/0"
