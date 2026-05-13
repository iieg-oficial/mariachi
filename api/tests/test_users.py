from app.core.security import hash_password
from app.models.user import Usuario
from tests.conftest import ADMIN_PREFIX


def test_listar_usuarios(admin_session):
    client = admin_session["client"]
    response = client.get(f"{ADMIN_PREFIX}/usuarios")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    assert len(response.json()) >= 1


def test_obtener_usuario(admin_session):
    client = admin_session["client"]
    admin_id = admin_session["user"].id
    response = client.get(f"{ADMIN_PREFIX}/usuarios/{admin_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "admin_test"
    assert "hashed_password" not in data


def test_obtener_usuario_no_existente(admin_session):
    client = admin_session["client"]
    response = client.get(f"{ADMIN_PREFIX}/usuarios/99999")
    assert response.status_code == 404


def test_crear_usuario_admin(admin_session):
    client = admin_session["client"]
    response = client.post(
        f"{ADMIN_PREFIX}/usuarios",
        headers={"X-CSRF-Token": admin_session["csrf"]},
        json={
            "username": "nuevo_usuario",
            "email": "nuevo@test.com",
            "name": "Nuevo Usuario",
            "password": "password123",
            "role": "editora",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "nuevo_usuario"
    assert "hashed_password" not in data


def test_crear_usuario_sin_permisos(editora_session):
    client = editora_session["client"]
    response = client.post(
        f"{ADMIN_PREFIX}/usuarios",
        headers={"X-CSRF-Token": editora_session["csrf"]},
        json={
            "username": "nuevo_usuario",
            "email": "nuevo@test.com",
            "name": "Nuevo Usuario",
            "password": "password123",
            "role": "editora",
        },
    )
    assert response.status_code == 403


def test_crear_usuario_duplicado(admin_session):
    client = admin_session["client"]
    response = client.post(
        f"{ADMIN_PREFIX}/usuarios",
        headers={"X-CSRF-Token": admin_session["csrf"]},
        json={
            "username": "admin_test",
            "email": "otro@test.com",
            "name": "Otro Usuario",
            "password": "password123",
            "role": "editora",
        },
    )
    assert response.status_code == 409


def test_actualizar_usuario_propio(editora_session):
    client = editora_session["client"]
    editora_id = editora_session["user"].id
    response = client.put(
        f"{ADMIN_PREFIX}/usuarios/{editora_id}",
        headers={"X-CSRF-Token": editora_session["csrf"]},
        json={"name": "Nombre Actualizado"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Nombre Actualizado"


def test_actualizar_usuario_otro_sin_permisos(editora_session, admin_user):
    client = editora_session["client"]
    response = client.put(
        f"{ADMIN_PREFIX}/usuarios/{admin_user.id}",
        headers={"X-CSRF-Token": editora_session["csrf"]},
        json={"name": "Intento Cambio"},
    )
    assert response.status_code == 403


def test_eliminar_usuario_admin(admin_session, db_session):
    usuario_eliminar = Usuario(
        username="eliminar_test",
        email="eliminar@test.com",
        name="Usuario a Eliminar",
        hashed_password=hash_password("test123"),
        role="editora",
    )
    db_session.add(usuario_eliminar)
    db_session.commit()
    db_session.refresh(usuario_eliminar)

    client = admin_session["client"]
    response = client.delete(
        f"{ADMIN_PREFIX}/usuarios/{usuario_eliminar.id}",
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 200


def test_eliminar_usuario_propio(admin_session):
    client = admin_session["client"]
    admin_id = admin_session["user"].id
    response = client.delete(
        f"{ADMIN_PREFIX}/usuarios/{admin_id}",
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 400


def test_editora_no_puede_autopromoverse_a_admin(editora_session, db_session):
    """Regresion: editora editandose a si misma no puede setear role a tetlamamakani."""
    client = editora_session["client"]
    editora_id = editora_session["user"].id
    response = client.put(
        f"{ADMIN_PREFIX}/usuarios/{editora_id}",
        headers={"X-CSRF-Token": editora_session["csrf"]},
        json={"role": "tetlamamakani"},
    )
    assert response.status_code == 200
    db_session.expire_all()
    refreshed = db_session.query(Usuario).filter(Usuario.id == editora_id).first()
    assert refreshed.role == "editora"


def test_editora_no_puede_cambiar_su_username(editora_session, db_session):
    """Editora no puede mutar su propio username (campo privilegiado)."""
    client = editora_session["client"]
    editora_id = editora_session["user"].id
    response = client.put(
        f"{ADMIN_PREFIX}/usuarios/{editora_id}",
        headers={"X-CSRF-Token": editora_session["csrf"]},
        json={"username": "editora_renamed"},
    )
    assert response.status_code == 200
    db_session.expire_all()
    refreshed = db_session.query(Usuario).filter(Usuario.id == editora_id).first()
    assert refreshed.username == "editora_test"


def test_editora_puede_actualizar_su_nombre_y_email(editora_session, db_session):
    """Self-update legitimo: nombre y email si pasan."""
    client = editora_session["client"]
    editora_id = editora_session["user"].id
    response = client.put(
        f"{ADMIN_PREFIX}/usuarios/{editora_id}",
        headers={"X-CSRF-Token": editora_session["csrf"]},
        json={"name": "Nuevo Nombre", "email": "nuevo@test.com"},
    )
    assert response.status_code == 200
    db_session.expire_all()
    refreshed = db_session.query(Usuario).filter(Usuario.id == editora_id).first()
    assert refreshed.name == "Nuevo Nombre"
    assert refreshed.email == "nuevo@test.com"


def test_editora_no_puede_resetear_password_de_otro(editora_session, admin_user):
    client = editora_session["client"]
    response = client.post(
        f"{ADMIN_PREFIX}/usuarios/{admin_user.id}/restablecer-contrasena",
        headers={"X-CSRF-Token": editora_session["csrf"]},
    )
    assert response.status_code == 403


def test_editora_no_puede_eliminar_otro_usuario(editora_session, admin_user):
    client = editora_session["client"]
    response = client.delete(
        f"{ADMIN_PREFIX}/usuarios/{admin_user.id}",
        headers={"X-CSRF-Token": editora_session["csrf"]},
    )
    assert response.status_code == 403


def test_admin_resetear_password_genera_temp(admin_session, db_session):
    """Reset por admin: temp_password retornada y must_change_password queda True."""
    target = Usuario(
        username="reset_target",
        email="reset@test.com",
        name="Target Reset",
        hashed_password=hash_password("oldpass123"),
        role="editora",
        must_change_password=False,
    )
    db_session.add(target)
    db_session.commit()
    db_session.refresh(target)

    response = admin_session["client"].post(
        f"{ADMIN_PREFIX}/usuarios/{target.id}/restablecer-contrasena",
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 200
    body = response.json()
    assert "temp_password" in body
    assert len(body["temp_password"]) == 12

    db_session.expire_all()
    refreshed = db_session.query(Usuario).filter(Usuario.id == target.id).first()
    assert refreshed.must_change_password is True


def test_editora_ve_emails_enmascarados_de_otros(editora_session, admin_user):
    """Privacidad: editora viendo OTRO usuario ve email enmascarado."""
    client = editora_session["client"]
    r = client.get(f"{ADMIN_PREFIX}/usuarios/{admin_user.id}")
    assert r.status_code == 200
    data = r.json()
    assert data["email"] != "admin@test.com"
    assert "*" in data["email"]
    assert data["projects"] == []


def test_editora_ve_su_propio_email_completo(editora_session):
    """Editora viendose a si misma: ve todo (incluye email + projects)."""
    client = editora_session["client"]
    editora_id = editora_session["user"].id
    r = client.get(f"{ADMIN_PREFIX}/usuarios/{editora_id}")
    assert r.status_code == 200
    data = r.json()
    assert data["email"] == "editora@test.com"
    assert "*" not in data["email"]


def test_admin_ve_emails_completos(admin_session, db_session):
    from app.core.security import hash_password
    from app.models.user import Usuario

    other = Usuario(
        username="other_user",
        email="other@test.com",
        name="Other",
        hashed_password=hash_password("x"),
        role="editora",
    )
    db_session.add(other)
    db_session.commit()
    db_session.refresh(other)

    client = admin_session["client"]
    r = client.get(f"{ADMIN_PREFIX}/usuarios/{other.id}")
    assert r.status_code == 200
    assert r.json()["email"] == "other@test.com"


def test_crear_usuario_con_proyecto_inexistente_falla(admin_session):
    response = admin_session["client"].post(
        f"{ADMIN_PREFIX}/usuarios",
        headers={"X-CSRF-Token": admin_session["csrf"]},
        json={
            "username": "asign_test",
            "email": "asign@test.com",
            "name": "Asign Test",
            "password": "password123",
            "role": "editora",
            "project_assignments": [
                {"project_slug": "proyecto-inexistente", "project_role": "editor"}
            ],
        },
    )
    assert response.status_code == 400
