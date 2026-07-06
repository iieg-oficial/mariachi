import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import hash_password
from app.core.settings import get_settings
from app.main import app
from app.models.sieej import Formulario, Grupo, formulario_grupo, usuario_grupo
from app.models.user import Usuario

settings = get_settings()
ADMIN_PREFIX = settings.admin_prefix
SIEEJ_TABLES = [t for t in Base.metadata.sorted_tables if t.schema == "sieej"]
PUBLIC_TABLES = [t for t in Base.metadata.sorted_tables if t.schema is None]


@pytest.fixture(scope="function")
def engine():
    eng = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    with eng.connect() as conn:
        conn.execute(text("ATTACH DATABASE ':memory:' AS sieej"))
        conn.commit()
    Base.metadata.create_all(bind=eng, tables=PUBLIC_TABLES + SIEEJ_TABLES)
    yield eng
    Base.metadata.drop_all(bind=eng, tables=SIEEJ_TABLES + PUBLIC_TABLES)


@pytest.fixture(scope="function")
def session(engine):
    factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    s = factory()
    yield s
    s.close()


@pytest.fixture(scope="function")
def client(session):
    def override():
        try:
            yield session
        finally:
            pass

    app.dependency_overrides[get_db] = override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def admin(session):
    u = Usuario(
        username="admin_g",
        email="ag@t.com",
        name="Admin G",
        hashed_password=hash_password("testpass123"),
        role="tetlamamakani",
    )
    session.add(u)
    session.commit()
    session.refresh(u)
    return u


@pytest.fixture(scope="function")
def usuarios_externos(session):
    users = []
    for i in range(3):
        u = Usuario(
            username=f"ext_{i}",
            email=f"e{i}@t.com",
            name=f"E{i}",
            hashed_password=hash_password("testpass123"),
            role="externo",
        )
        session.add(u)
        session.commit()
        session.refresh(u)
        users.append(u)
    return users


def login(client, username, password="testpass123"):
    r = client.post(
        f"{ADMIN_PREFIX}/autenticacion/iniciar-sesion",
        json={"username": username, "password": password},
    )
    assert r.status_code == 200
    return r.json()["csrf_token"]


def test_admin_crud_basico_grupos(client, admin):
    csrf = login(client, admin.username)

    r1 = client.post(
        f"{ADMIN_PREFIX}/sieej/grupos",
        headers={"X-CSRF-Token": csrf},
        json={"nombre": "Dependencias estatales", "descripcion": "test"},
    )
    assert r1.status_code == 201, r1.text
    gid = r1.json()["id"]

    r2 = client.get(f"{ADMIN_PREFIX}/sieej/grupos")
    assert r2.status_code == 200
    assert any(g["id"] == gid for g in r2.json())

    r3 = client.put(
        f"{ADMIN_PREFIX}/sieej/grupos/{gid}",
        headers={"X-CSRF-Token": csrf},
        json={"nombre": "Otro nombre"},
    )
    assert r3.status_code == 200
    assert r3.json()["nombre"] == "Otro nombre"

    r4 = client.delete(
        f"{ADMIN_PREFIX}/sieej/grupos/{gid}",
        headers={"X-CSRF-Token": csrf},
    )
    assert r4.status_code == 200


def test_admin_crear_grupo_con_miembros(client, admin, usuarios_externos):
    csrf = login(client, admin.username)
    ids = [u.id for u in usuarios_externos[:2]]

    r = client.post(
        f"{ADMIN_PREFIX}/sieej/grupos",
        headers={"X-CSRF-Token": csrf},
        json={"nombre": "Con miembros", "usuarios": ids},
    )
    assert r.status_code == 201, r.text
    gid = r.json()["id"]

    r2 = client.get(f"{ADMIN_PREFIX}/sieej/grupos/{gid}/usuarios")
    assert r2.status_code == 200
    assert sorted(u["id"] for u in r2.json()) == sorted(ids)


def test_admin_crear_grupo_con_miembro_inexistente_400(client, admin):
    csrf = login(client, admin.username)
    r = client.post(
        f"{ADMIN_PREFIX}/sieej/grupos",
        headers={"X-CSRF-Token": csrf},
        json={"nombre": "Miembro fantasma", "usuarios": [99999]},
    )
    assert r.status_code == 400


def test_admin_crear_grupo_duplicado_409(client, admin, session):
    session.add(Grupo(nombre="dup"))
    session.commit()

    csrf = login(client, admin.username)
    r = client.post(
        f"{ADMIN_PREFIX}/sieej/grupos",
        headers={"X-CSRF-Token": csrf},
        json={"nombre": "dup"},
    )
    assert r.status_code == 409


def test_admin_actualizar_miembros_reemplaza(client, admin, session, usuarios_externos):
    g = Grupo(nombre="g-mem")
    session.add(g)
    session.commit()
    session.refresh(g)

    csrf = login(client, admin.username)
    r = client.put(
        f"{ADMIN_PREFIX}/sieej/grupos/{g.id}/usuarios",
        headers={"X-CSRF-Token": csrf},
        json={"usuarios": [u.id for u in usuarios_externos[:2]]},
    )
    assert r.status_code == 200, r.text

    miembros = (
        session.query(usuario_grupo).filter(usuario_grupo.c.grupo_id == g.id).count()
    )
    assert miembros == 2

    r2 = client.put(
        f"{ADMIN_PREFIX}/sieej/grupos/{g.id}/usuarios",
        headers={"X-CSRF-Token": csrf},
        json={"usuarios": [usuarios_externos[2].id]},
    )
    assert r2.status_code == 200
    miembros2 = (
        session.query(usuario_grupo).filter(usuario_grupo.c.grupo_id == g.id).count()
    )
    assert miembros2 == 1


def test_admin_listar_miembros(client, admin, session, usuarios_externos):
    g = Grupo(nombre="g-list")
    session.add(g)
    session.commit()
    session.refresh(g)
    for u in usuarios_externos:
        session.execute(
            usuario_grupo.insert().values(grupo_id=g.id, usuario_id=u.id)
        )
    session.commit()

    login(client, admin.username)
    r = client.get(f"{ADMIN_PREFIX}/sieej/grupos/{g.id}/usuarios")
    assert r.status_code == 200
    assert len(r.json()) == 3


def test_admin_borrar_grupo_con_formularios_falla_400(client, admin, session):
    g = Grupo(nombre="g-bf")
    session.add(g)
    session.commit()
    session.refresh(g)

    f = Formulario(
        slug="form-bf",
        nombre="Form BF",
        definicion={"version": 1, "steps": [{"id": "s", "type": "form", "title": "s", "fields": [{"name": "n", "label": "N", "type": "text"}]}]},
        estado="activo",
        version=1,
        creado_por_id=admin.id,
    )
    session.add(f)
    session.commit()
    session.refresh(f)
    session.execute(
        formulario_grupo.insert().values(formulario_id=f.id, grupo_id=g.id)
    )
    session.commit()

    csrf = login(client, admin.username)
    r = client.delete(
        f"{ADMIN_PREFIX}/sieej/grupos/{g.id}",
        headers={"X-CSRF-Token": csrf},
    )
    assert r.status_code == 400


def test_admin_asignar_usuarios_inexistentes_falla(client, admin, session):
    g = Grupo(nombre="g-bad")
    session.add(g)
    session.commit()
    session.refresh(g)

    csrf = login(client, admin.username)
    r = client.put(
        f"{ADMIN_PREFIX}/sieej/grupos/{g.id}/usuarios",
        headers={"X-CSRF-Token": csrf},
        json={"usuarios": [99999]},
    )
    assert r.status_code == 400
