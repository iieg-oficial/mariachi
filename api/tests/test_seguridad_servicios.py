from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.api.routes import mapalab_api_keys_internal, mapalab_mcp_internal
from app.services import acervo_upload_clients, stats_templates
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


class _ConexionWorkspaces:
    def __init__(self, schemas: list[str | None]) -> None:
        self.schemas = schemas
        self.sql: list[str] = []

    def execute(self, query, params=None):
        self.sql.append(str(query))
        return SimpleNamespace(scalars=lambda: iter(self.schemas))


def test_schemas_permitidos_salen_de_workspaces_sin_mapalab():
    conn = _ConexionWorkspaces(["salud", "mapalab", None, "demografia"])
    assert stats_templates.schemas_permitidos(conn) == WORKSPACES
    assert "mapalab.workspaces" in conn.sql[0]


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


@pytest.mark.parametrize("modulo", [mapalab_api_keys_internal, mapalab_mcp_internal])
def test_tokens_internos_de_mapalab(monkeypatch, modulo):
    monkeypatch.setattr(
        modulo, "get_settings", lambda: SimpleNamespace(mapalab_internal_token="correcto")
    )
    modulo._require_internal_token("correcto")
    with pytest.raises(HTTPException) as exc:
        modulo._require_internal_token("incorrecto")
    assert exc.value.status_code == 401


def test_token_interno_de_acervo(monkeypatch):
    monkeypatch.setattr(
        acervo_upload_clients,
        "get_settings",
        lambda: SimpleNamespace(acervo_internal_token="correcto"),
    )
    assert acervo_upload_clients.resolve_upload_client("correcto").client == "portal"
    with pytest.raises(HTTPException):
        acervo_upload_clients.resolve_upload_client("correct")
