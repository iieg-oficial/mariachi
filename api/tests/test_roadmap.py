"""La hoja de ruta se lee desde el panel y solo se edita con el permiso.

`GET /hitos` lo consulta el inicio, que cualquiera del panel ve. Las tres
escrituras piden `mariachi.roadmap.manage`: sin el, el boton de edicion no se
dibuja en el CMS, pero la API tiene que negarlo igual.
"""
import pytest

from app.models.roadmap import RoadmapHito
from tests.conftest import login_as

RUTA = "/api/mariachi/roadmap/hitos"


def _hito(clave="mariachi-2", **extra):
    base = {
        "clave": clave,
        "etiqueta": "mariachi 2",
        "proyecto": "mariachi",
        "tipo": "mayor",
        "fecha_eje": "2026-08-10",
        "fecha_texto": "10 ago 2026",
        "motivo": "La identidad se va a minerva.",
    }
    base.update(extra)
    return base


@pytest.fixture
def sembrado(db_session):
    db_session.add(RoadmapHito(**_hito()))
    db_session.commit()


def test_lista_ordenada_por_fecha(admin_session, db_session, sembrado):
    db_session.add(RoadmapHito(**_hito(clave="dataengine-1", fecha_eje="2026-02-25")))
    db_session.commit()

    res = admin_session["client"].get(RUTA)

    assert res.status_code == 200
    assert [h["clave"] for h in res.json()] == ["dataengine-1", "mariachi-2"]


def test_editora_lee_pero_no_escribe(client, editora_user, sembrado):
    csrf = login_as(client, editora_user, {"mariachi.portal.view"})

    assert client.get(RUTA).status_code == 200

    res = client.put(
        f"{RUTA}/mariachi-2",
        json=_hito(etiqueta="otra cosa"),
        headers={"X-CSRF-Token": csrf},
    )
    assert res.status_code == 403


def test_actualizar_cambia_la_fecha_del_eje(admin_session, sembrado):
    res = admin_session["client"].put(
        f"{RUTA}/mariachi-2",
        json=_hito(fecha_eje="2026-09-01", fecha_texto="1 sep 2026"),
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )

    assert res.status_code == 200
    assert res.json()["fecha_eje"] == "2026-09-01"


def test_rechaza_una_fecha_que_no_es_iso(admin_session, sembrado):
    res = admin_session["client"].put(
        f"{RUTA}/mariachi-2",
        json=_hito(fecha_eje="10/08/2026"),
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )

    assert res.status_code == 422


def test_rechaza_un_tipo_desconocido(admin_session, sembrado):
    res = admin_session["client"].put(
        f"{RUTA}/mariachi-2",
        json=_hito(tipo="invento"),
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )

    assert res.status_code == 422


def test_no_admite_dos_hitos_con_la_misma_clave(admin_session, sembrado):
    res = admin_session["client"].post(
        RUTA,
        json=_hito(),
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )

    assert res.status_code == 409


def test_eliminar_deja_de_listarlo(admin_session, sembrado):
    borrado = admin_session["client"].delete(
        f"{RUTA}/mariachi-2",
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )

    assert borrado.status_code == 204
    assert admin_session["client"].get(RUTA).json() == []


def test_un_hito_que_no_existe_da_404(admin_session):
    res = admin_session["client"].delete(
        f"{RUTA}/no-existe",
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )

    assert res.status_code == 404
