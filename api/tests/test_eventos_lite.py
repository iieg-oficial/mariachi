import pytest

from app.models.evento import Evento
from app.models.project import Project
from app.schemas.evento import EventoPublicResponse
from tests.conftest import ADMIN_PREFIX

ESTILO_MEXICO = {
    "fondo": {"forma": "mitades", "colores": ["morado", "naranja"]},
    "borde": {"forma": "tercios", "colores": ["#006847", "#ffffff", "#ce1126"]},
}


def _seed_mapalab(db_session):
    db_session.add(Project(slug="mapalab", name="MapaLab", is_active=True))
    db_session.commit()


def _crear(admin_session, **campos):
    return admin_session["client"].post(
        f"{ADMIN_PREFIX}/eventos",
        json={"titulo": "Fiestas patrias", **campos},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )


def test_evento_lite_con_estilo_se_crea(admin_session, db_session):
    _seed_mapalab(db_session)
    response = _crear(
        admin_session,
        modo="lite",
        animacion="aguilas",
        botonEstilo=ESTILO_MEXICO,
        avisoInicial="  ¡Toca para un dato curioso!  ",
        facts=[
            {"text": "Dato", "animacion": "pelota"},
            {"text": "Otro"},
            {"text": "Mezcala", "animacion": "aguilas", "destino": {"lon": -103.0105, "lat": 20.328}},
            {
                "text": "Cuesta de Sayula",
                "animacion": "aguilas",
                "destino": {
                    "lon": -103.6089,
                    "lat": 19.8572,
                    "zoom": 13,
                    "ruta": [{"lon": -103.5931, "lat": 20.2441}, {"lon": -103.5665, "lat": 19.9661}],
                },
            },
        ],
    )
    assert response.status_code == 201
    body = response.json()
    assert body["modo"] == "lite"
    assert body["animacion"] == "aguilas"
    assert body["botonEstilo"]["borde"]["colores"] == ["#006847", "#FFFFFF", "#CE1126"]
    assert body["avisoInicial"] == "¡Toca para un dato curioso!"
    assert body["facts"][0]["animacion"] == "pelota"
    assert body["facts"][1]["animacion"] is None
    assert body["facts"][1]["destino"] is None
    assert body["facts"][2]["destino"] == {"lon": -103.0105, "lat": 20.328, "zoom": 15, "ruta": None}
    ruta = body["facts"][3]["destino"]["ruta"]
    assert [p["lat"] for p in ruta] == [20.2441, 19.9661]
    assert body["facts"][3]["destino"]["zoom"] == 13


def test_por_defecto_es_completo_con_pelota(admin_session, db_session):
    _seed_mapalab(db_session)
    body = _crear(admin_session).json()
    assert body["modo"] == "completo"
    assert body["animacion"] == "pelota"
    assert body["botonEstilo"] is None


@pytest.mark.parametrize("campos", [
    {"animacion": "cohete"},
    {"modo": "mini"},
    {"facts": [{"text": "Dato", "destino": {"lon": -200, "lat": 20}}]},
    {"facts": [{"text": "Dato", "destino": {"lon": -103, "lat": 20, "zoom": 22}}]},
    {"facts": [{"text": "Dato", "destino": {"lat": 20}}]},
    {"facts": [{"text": "Dato", "destino": {"lon": -103, "lat": 20, "ruta": [{"lon": -103, "lat": 20}] * 13}}]},
    {"facts": [{"text": "Dato", "destino": {"lon": -103, "lat": 20, "ruta": [{"lon": -200, "lat": 20}]}}]},
    {"facts": [{"text": "Dato", "destino": {"lon": -103, "lat": 20, "ruta": [{"lon": -103}]}}]},
    {"botonEstilo": {"fondo": {"forma": "solido", "colores": ["#FF8300"]}}},
    {"botonEstilo": {"fondo": {"forma": "mitades", "colores": ["morado"]}}},
    {"botonEstilo": {"borde": {"forma": "solido", "colores": ["naranja"]}}},
    {"facts": [{"text": "Dato", "animacion": "cohete"}]},
    {"avisoInicial": "x" * 81},
])
def test_rechaza_valores_invalidos(admin_session, db_session, campos):
    _seed_mapalab(db_session)
    assert _crear(admin_session, **campos).status_code == 422


def test_patch_no_deja_modo_ni_animacion_nulos(admin_session, db_session):
    _seed_mapalab(db_session)
    evento = _crear(admin_session).json()
    for campo in ("modo", "animacion"):
        response = admin_session["client"].patch(
            f"{ADMIN_PREFIX}/eventos/{evento['id']}",
            json={campo: None},
            headers={"X-CSRF-Token": admin_session["csrf"]},
        )
        assert response.status_code == 422


def test_respuesta_publica_expone_la_diversion(db_session):
    evento = Evento(
        slug="lite",
        titulo="Lite",
        modo="lite",
        animacion="aguilas",
        boton_estilo=ESTILO_MEXICO,
        aviso_inicial="Hola",
        estado="published",
        activo=True,
    )
    db_session.add(evento)
    db_session.commit()
    data = EventoPublicResponse.model_validate(evento).model_dump(by_alias=True, mode="json")
    assert data["modo"] == "lite"
    assert data["animacion"] == "aguilas"
    assert data["avisoInicial"] == "Hola"
    assert data["botonEstilo"]["fondo"]["colores"] == ["morado", "naranja"]
