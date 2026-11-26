from unittest.mock import patch

import pytest

from app.models.borrador import Borrador
from tests.conftest import ADMIN_PREFIX, login_as

LOTE = f"{ADMIN_PREFIX}/geoserver/estilos-lote"
BORRADORES = f"{ADMIN_PREFIX}/borradores"
EDICION = {"mariachi.sextante.view", "mariachi.mapalab.view", "mariachi.mapalab.update"}
APROBACION = EDICION | {"mariachi.sextante.manage"}


def _borrador(db, usuario, resource_id: str, estado: str = "en_progreso") -> Borrador:
    borrador = Borrador(
        resource_type="sld", resource_id=resource_id, usuario_id=usuario.id,
        data={"shape": "xml", "xml": "<a/>", "origen": "lote"}, estado=estado,
    )
    db.add(borrador)
    db.commit()
    db.refresh(borrador)
    return borrador


def test_edicion_ve_solo_sus_borradores(client, db_session, editora_user, admin_user):
    _borrador(db_session, editora_user, "s:propio")
    _borrador(db_session, admin_user, "s:ajeno")
    login_as(client, editora_user, EDICION)
    r = client.get(f"{LOTE}/sin-publicar")
    assert r.status_code == 200
    assert [b["resource_id"] for b in r.json()] == ["s:propio"]


def test_aprobacion_ve_los_suyos_y_los_enviados_a_revision(client, db_session, editora_user, admin_user):
    _borrador(db_session, editora_user, "s:a")
    _borrador(db_session, editora_user, "s:enviado", "pendiente_revision")
    _borrador(db_session, admin_user, "s:b")
    login_as(client, admin_user, APROBACION)
    vistos = {b["resource_id"] for b in client.get(f"{LOTE}/sin-publicar").json()}
    assert vistos == {"s:b", "s:enviado"}


def test_sin_edicion_no_entra_al_lote(client, editora_user):
    login_as(client, editora_user, {"mariachi.sextante.view"})
    assert client.get(f"{LOTE}/sin-publicar").status_code == 403


def test_edicion_envia_a_revision_y_no_publica(client, db_session, editora_user):
    borrador = _borrador(db_session, editora_user, "s:homicidio", "rechazado")
    h = {"X-CSRF-Token": login_as(client, editora_user, EDICION)}
    r = client.post(f"{BORRADORES}/sld/s:homicidio/solicitar-revision", headers=h)
    assert r.status_code == 200
    db_session.refresh(borrador)
    assert borrador.estado == "pendiente_revision"
    assert client.post(f"{BORRADORES}/por-id/{borrador.id}/aprobar", headers=h).status_code == 403


@pytest.mark.parametrize("estado", ["en_progreso", "pendiente_revision", "rechazado"])
def test_aprobacion_publica_cualquier_borrador_activo(client, db_session, editora_user, admin_user, estado):
    borrador = _borrador(db_session, editora_user, "s:x", estado)
    h = {"X-CSRF-Token": login_as(client, admin_user, APROBACION)}
    with patch("app.api.routes.borradores.borrador_service.apply_borrador", return_value={}):
        r = client.post(f"{BORRADORES}/por-id/{borrador.id}/aprobar", headers=h)
    assert r.status_code == 200, r.text
    db_session.refresh(borrador)
    assert borrador.estado == "aprobado"


def test_no_se_aprueba_dos_veces(client, db_session, editora_user, admin_user):
    borrador = _borrador(db_session, editora_user, "s:x", "aprobado")
    h = {"X-CSRF-Token": login_as(client, admin_user, APROBACION)}
    assert client.post(f"{BORRADORES}/por-id/{borrador.id}/aprobar", headers=h).status_code == 400
