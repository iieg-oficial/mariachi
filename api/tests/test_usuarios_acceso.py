import pytest
from fastapi import HTTPException

from app.models.user import Usuario
from app.services import minerva_admin
from tests.conftest import ADMIN_PREFIX, PERMISOS_EDITORA, login_as

ENLACE = {
    "url": "https://minerva.test/activar#token=abc",
    "purpose": "invite",
    "expires_at": "2026-10-26T00:00:00Z",
}


def _persona(minerva_id="m-1", email="nueva@test.com", roles=None):
    return {"id": minerva_id, "email": email, "full_name": "Persona", "status": "pending", "roles": roles or []}


@pytest.fixture
def minerva(monkeypatch):
    llamadas = []
    estado = {"existente": None}

    async def buscar_por_correo(token, email):
        llamadas.append(("buscar", email))
        return estado["existente"]

    async def dar_de_alta(token, email, nombre, role_ids):
        llamadas.append(("alta", email, nombre, role_ids))
        return {**_persona(), "created": True, "credential_link": ENLACE}

    async def fijar_roles(token, persona_id, role_ids):
        llamadas.append(("roles", persona_id, role_ids))
        roles = [{"id": r, "slug": r, "name": r, "via": "direct"} for r in role_ids]
        return _persona(persona_id, roles=roles)

    async def emitir_enlace(token, persona_id):
        llamadas.append(("enlace", persona_id))
        return {**ENLACE, "purpose": "reset"}

    async def listar_personas(token):
        return [_persona("m-9", "ligada@test.com")]

    for nombre, fn in {
        "buscar_por_correo": buscar_por_correo,
        "dar_de_alta": dar_de_alta,
        "fijar_roles": fijar_roles,
        "emitir_enlace": emitir_enlace,
        "listar_personas": listar_personas,
    }.items():
        monkeypatch.setattr(minerva_admin, nombre, fn)
    return {"llamadas": llamadas, "estado": estado}


@pytest.fixture
def persona_local(db_session):
    usuario = Usuario(
        username="nueva",
        email="nueva@test.com",
        name="Ana",
        hashed_password="!minerva",
        role="editora",
    )
    db_session.add(usuario)
    db_session.commit()
    db_session.refresh(usuario)
    return usuario


def _put(session, usuario_id, role_ids):
    return session["client"].put(
        f"{ADMIN_PREFIX}/usuarios/{usuario_id}/acceso",
        json={"roleIds": role_ids},
        headers={"X-CSRF-Token": session["csrf"]},
    )


def test_sin_permiso_de_acceso_responde_403(client, editora_user, persona_local, minerva):
    csrf = login_as(client, editora_user, PERMISOS_EDITORA)
    resp = _put({"client": client, "csrf": csrf}, persona_local.id, ["r-1"])
    assert resp.status_code == 403
    assert minerva["llamadas"] == []


def test_alta_en_minerva_vincula_y_devuelve_el_enlace(admin_session, persona_local, minerva, db_session):
    resp = _put(admin_session, persona_local.id, ["r-1"])
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["enlace"]["purpose"] == "invite"
    assert [r["slug"] for r in body["persona"]["roles"]] == ["r-1"]
    alta = next(c for c in minerva["llamadas"] if c[0] == "alta")
    assert alta[2] == "Ana (nueva@test.com)"
    db_session.refresh(persona_local)
    assert persona_local.minerva_sub == "m-1"


def test_persona_existente_en_minerva_se_vincula_sin_alta(admin_session, persona_local, minerva, db_session):
    minerva["estado"]["existente"] = _persona("m-7")
    resp = _put(admin_session, persona_local.id, ["r-1"])
    assert resp.status_code == 200
    assert resp.json()["enlace"] is None
    assert not any(c[0] == "alta" for c in minerva["llamadas"])
    db_session.refresh(persona_local)
    assert persona_local.minerva_sub == "m-7"


def test_sin_roles_y_sin_cuenta_no_crea_nada(admin_session, persona_local, minerva):
    resp = _put(admin_session, persona_local.id, [])
    assert resp.status_code == 200
    assert resp.json() == {"persona": None, "enlace": None}
    assert not any(c[0] in {"alta", "roles"} for c in minerva["llamadas"])


def test_cuenta_vinculada_a_otra_ficha_responde_409(admin_session, persona_local, minerva, db_session, editora_user):
    editora_user.minerva_sub = "m-7"
    db_session.commit()
    minerva["estado"]["existente"] = _persona("m-7")
    assert _put(admin_session, persona_local.id, ["r-1"]).status_code == 409


def test_error_de_minerva_se_propaga_con_su_detalle(admin_session, persona_local, monkeypatch):
    persona_local.minerva_sub = "m-1"

    async def rechazar(token, persona_id, role_ids):
        raise HTTPException(status_code=403, detail="No puedes cambiar tus propios roles")

    monkeypatch.setattr(minerva_admin, "fijar_roles", rechazar)
    resp = _put(admin_session, persona_local.id, ["r-1"])
    assert resp.status_code == 403
    assert resp.json()["detail"] == "No puedes cambiar tus propios roles"


def test_enlace_exige_cuenta_vinculada(admin_session, persona_local, minerva):
    resp = admin_session["client"].post(
        f"{ADMIN_PREFIX}/usuarios/{persona_local.id}/acceso/enlace",
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert resp.status_code == 409


def test_enlace_de_cuenta_vinculada(admin_session, persona_local, minerva, db_session):
    persona_local.minerva_sub = "m-1"
    db_session.commit()
    resp = admin_session["client"].post(
        f"{ADMIN_PREFIX}/usuarios/{persona_local.id}/acceso/enlace",
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert resp.status_code == 200
    assert resp.json()["purpose"] == "reset"


def test_personas_traen_la_ficha_local(admin_session, persona_local, minerva, db_session):
    persona_local.minerva_sub = "m-9"
    db_session.commit()
    resp = admin_session["client"].get(f"{ADMIN_PREFIX}/usuarios/acceso/personas")
    assert resp.status_code == 200
    assert resp.json()[0]["usuario_id"] == persona_local.id


def test_eliminar_retira_el_acceso_en_minerva(admin_session, persona_local, minerva, db_session):
    persona_local.minerva_sub = "m-1"
    db_session.commit()
    resp = admin_session["client"].delete(
        f"{ADMIN_PREFIX}/usuarios/{persona_local.id}",
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert resp.status_code == 200, resp.text
    assert ("roles", "m-1", []) in minerva["llamadas"]
