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
            "password": "Password123!",
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
            "password": "Password123!",
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
            "password": "Password123!",
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


def test_editora_no_puede_eliminar_otro_usuario(editora_session, admin_user):
    client = editora_session["client"]
    response = client.delete(
        f"{ADMIN_PREFIX}/usuarios/{admin_user.id}",
        headers={"X-CSRF-Token": editora_session["csrf"]},
    )
    assert response.status_code == 403


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
            "password": "Password123!",
            "role": "editora",
            "project_assignments": [
                {"project_slug": "proyecto-inexistente", "project_role": "editor"}
            ],
        },
    )
    assert response.status_code == 400


def test_listar_usuarios_expone_avatar_y_vinculo_minerva(admin_session, db_session):
    usuario = Usuario(
        username="vinculado_test",
        email="vinculado@test.com",
        name="Usuario Vinculado",
        hashed_password=hash_password("test123"),
        role="editora",
        minerva_sub="sub-123",
        avatar_url="/acervo/avatars/vinculado.webp",
    )
    db_session.add(usuario)
    db_session.commit()

    client = admin_session["client"]
    response = client.get(f"{ADMIN_PREFIX}/usuarios")
    assert response.status_code == 200
    fila = next(u for u in response.json() if u["username"] == "vinculado_test")
    assert fila["minerva_vinculado"] is True
    assert fila["avatarUrl"] is not None

    propia = next(u for u in response.json() if u["username"] == "admin_test")
    assert propia["minerva_vinculado"] is False


def test_impacto_eliminacion_cuenta_envios_y_formularios(admin_session, db_session):
    from app.models.sieej import EnvioFormulario, Formulario

    autor = Usuario(
        username="autor_test",
        email="autor@test.com",
        name="Autor Test",
        hashed_password=hash_password("test123"),
        role="editora",
    )
    db_session.add(autor)
    db_session.commit()
    db_session.refresh(autor)

    formulario = Formulario(
        slug="form-impacto",
        nombre="Form Impacto",
        descripcion="desc",
        definicion={"secciones": []},
        estado="activo",
        publico=False,
        version=1,
        creado_por_id=autor.id,
    )
    db_session.add(formulario)
    db_session.commit()
    db_session.refresh(formulario)

    db_session.add(
        EnvioFormulario(
            formulario_id=formulario.id,
            formulario_version=formulario.version,
            definicion_snapshot=formulario.definicion,
            usuario_id=autor.id,
            estado="en_proceso",
            datos={},
            paso_actual=0,
        )
    )
    db_session.commit()

    client = admin_session["client"]
    response = client.get(f"{ADMIN_PREFIX}/usuarios/{autor.id}/impacto-eliminacion")
    assert response.status_code == 200
    data = response.json()
    assert data["envios"] == 1
    assert data["formularios_creados"] == 1
    assert data["bloqueado"] is True


def test_eliminar_autor_de_formulario_responde_409(admin_session, db_session):
    from app.models.sieej import Formulario

    autor = Usuario(
        username="autor_bloqueado",
        email="autor_bloqueado@test.com",
        name="Autor Bloqueado",
        hashed_password=hash_password("test123"),
        role="editora",
    )
    db_session.add(autor)
    db_session.commit()
    db_session.refresh(autor)

    db_session.add(
        Formulario(
            slug="form-bloqueo",
            nombre="Form Bloqueo",
            descripcion="desc",
            definicion={"secciones": []},
            estado="activo",
            publico=False,
            version=1,
            creado_por_id=autor.id,
        )
    )
    db_session.commit()

    client = admin_session["client"]
    response = client.delete(
        f"{ADMIN_PREFIX}/usuarios/{autor.id}",
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 409
    assert "SIEEJ" in response.json()["detail"]
    assert db_session.query(Usuario).filter(Usuario.id == autor.id).first() is not None


def test_listar_usuarios_expone_ultimo_acceso(admin_session, db_session):
    from app.core.time import utcnow

    entro = Usuario(
        username="con_acceso",
        email="con_acceso@test.com",
        name="Con Acceso",
        hashed_password=hash_password("test123"),
        role="editora",
        ultimo_acceso=utcnow(),
    )
    nunca = Usuario(
        username="sin_acceso",
        email="sin_acceso@test.com",
        name="Sin Acceso",
        hashed_password=hash_password("test123"),
        role="editora",
    )
    db_session.add_all([entro, nunca])
    db_session.commit()

    client = admin_session["client"]
    filas = {u["username"]: u for u in client.get(f"{ADMIN_PREFIX}/usuarios").json()}
    assert filas["con_acceso"]["ultimo_acceso"] is not None
    assert filas["sin_acceso"]["ultimo_acceso"] is None


def test_el_login_sella_el_ultimo_acceso(db_session):
    from app.api.routes.auth import resolve_user

    usuario = Usuario(
        username="sellado_test",
        email="sellado@test.com",
        name="Sellado Test",
        hashed_password=hash_password("test123"),
        role="editora",
        minerva_sub="sub-sellado",
    )
    db_session.add(usuario)
    db_session.commit()
    assert usuario.ultimo_acceso is None

    resolve_user(db_session, {"sub": "sub-sellado", "email": "sellado@test.com", "name": "Sellado Test"})

    db_session.refresh(usuario)
    assert usuario.ultimo_acceso is not None
