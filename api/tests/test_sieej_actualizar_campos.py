"""Tests de la actualizacion ligera de campos y su historial append-only.

Se prueban a nivel de servicio (`EnviosService.actualizar_campos`) para
verificar la logica de merge parcial, la seguridad de campos permitidos y el
historial append-only sin depender del flujo HTTP/login.
"""
import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.core.security import hash_password
from app.core.time import utcnow
from app.models.sieej import (
    EnvioEvento,
    EnvioFormulario,
    EnvioValorHistorial,
    Formulario,
)
from app.models.user import Usuario
from app.services.sieej.envios_service import EnviosService


def _is_pg_only(table) -> bool:
    return any(isinstance(col.type, (JSONB, ARRAY)) for col in table.columns)


SIEEJ_TABLES = [
    t for t in Base.metadata.sorted_tables
    if t.schema == "sieej" and not _is_pg_only(t)
]
PUBLIC_TABLES = [
    t for t in Base.metadata.sorted_tables
    if t.schema is None and not _is_pg_only(t)
]


DEFINICION = {
    "version": 1,
    "steps": [
        {
            "id": "general",
            "type": "form",
            "title": "Datos generales",
            "fields": [
                {
                    "name": "razon_social",
                    "label": "Razon social",
                    "type": "text",
                    "required": True,
                    "editableAfterSubmit": True,
                },
                {"name": "clave", "label": "Clave", "type": "text"},
                {
                    "name": "telefono",
                    "label": "Telefono",
                    "type": "text",
                    "editableAfterSubmit": True,
                },
            ],
        },
        {
            "id": "resumen",
            "type": "summary",
            "title": "Resumen",
            "fields": [],
        },
    ],
}


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
    session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    s = session_factory()
    yield s
    s.close()


def _usuario(session, suffix):
    u = Usuario(
        username=f"user_{suffix}",
        email=f"{suffix}@test.com",
        name=f"User {suffix}",
        hashed_password=hash_password("testpass123"),
        role="externo",
    )
    session.add(u)
    session.commit()
    session.refresh(u)
    return u


@pytest.fixture(scope="function")
def admin(session):
    return _usuario(session, "admin")


@pytest.fixture(scope="function")
def user_a(session):
    return _usuario(session, "a")


@pytest.fixture(scope="function")
def user_b(session):
    return _usuario(session, "b")


@pytest.fixture(scope="function")
def formulario(session, admin):
    f = Formulario(
        slug="form-test",
        nombre="Form Test",
        descripcion="desc",
        definicion=DEFINICION,
        estado="activo",
        publico=False,
        version=3,
        creado_por_id=admin.id,
    )
    session.add(f)
    session.commit()
    session.refresh(f)
    return f


def crear_envio(session, formulario, user, *, estado="enviado", datos=None):
    e = EnvioFormulario(
        formulario_id=formulario.id,
        formulario_version=formulario.version,
        definicion_snapshot=formulario.definicion,
        usuario_id=user.id,
        estado=estado,
        datos=datos if datos is not None else {"general": {"razon_social": "Acme"}},
        paso_actual=0,
        enviado_en=utcnow() if estado == "enviado" else None,
    )
    session.add(e)
    session.commit()
    session.refresh(e)
    return e


# ---------------------------------------------------------------------------
# editable_field_paths (helper)
# ---------------------------------------------------------------------------


def test_editable_field_paths_solo_marcados_de_pasos_form():
    paths = EnviosService.editable_field_paths(DEFINICION)
    assert paths == {
        "general.razon_social": "Razon social",
        "general.telefono": "Telefono",
    }


# ---------------------------------------------------------------------------
# actualizar_campos
# ---------------------------------------------------------------------------


def test_merge_parcial_conserva_estado_y_registra_historial(
    session, formulario, user_a
):
    envio = crear_envio(
        session, formulario, user_a,
        datos={"general": {"razon_social": "Acme", "clave": "K1"}},
    )
    svc = EnviosService(session)
    out = svc.actualizar_campos(user_a, envio.id, {"general.razon_social": "Acme SA"})

    assert out.estado == "enviado"
    assert out.datos["general"]["razon_social"] == "Acme SA"
    # merge parcial: los campos no tocados permanecen
    assert out.datos["general"]["clave"] == "K1"

    hist = session.query(EnvioValorHistorial).filter_by(envio_id=envio.id).all()
    assert len(hist) == 1
    assert hist[0].field_path == "general.razon_social"
    assert hist[0].valor_anterior == "Acme"
    assert hist[0].valor_nuevo == "Acme SA"
    assert hist[0].formulario_version == formulario.version
    assert hist[0].actor_usuario_id == user_a.id
    assert hist[0].field_label == "Razon social"

    eventos = session.query(EnvioEvento).filter_by(
        envio_id=envio.id, tipo="actualizado"
    ).all()
    assert len(eventos) == 1
    assert eventos[0].payload == {"campos": ["general.razon_social"], "n": 1}


def test_campo_no_editable_rechazado_422_sin_historial(session, formulario, user_a):
    envio = crear_envio(session, formulario, user_a)
    svc = EnviosService(session)
    with pytest.raises(HTTPException) as exc:
        svc.actualizar_campos(user_a, envio.id, {"general.clave": "hack"})
    assert exc.value.status_code == 422
    session.rollback()
    assert session.query(EnvioValorHistorial).count() == 0


def test_no_op_no_genera_historial_ni_evento(session, formulario, user_a):
    envio = crear_envio(
        session, formulario, user_a, datos={"general": {"razon_social": "Acme"}},
    )
    svc = EnviosService(session)
    svc.actualizar_campos(user_a, envio.id, {"general.razon_social": "Acme"})
    assert session.query(EnvioValorHistorial).count() == 0
    assert session.query(EnvioEvento).filter_by(tipo="actualizado").count() == 0


def test_historial_append_only_en_cambios_sucesivos(session, formulario, user_a):
    envio = crear_envio(
        session, formulario, user_a, datos={"general": {"razon_social": "A"}},
    )
    svc = EnviosService(session)
    svc.actualizar_campos(user_a, envio.id, {"general.razon_social": "B"})
    svc.actualizar_campos(user_a, envio.id, {"general.razon_social": "C"})

    hist = (
        session.query(EnvioValorHistorial)
        .filter_by(envio_id=envio.id)
        .order_by(EnvioValorHistorial.id)
        .all()
    )
    assert [(h.valor_anterior, h.valor_nuevo) for h in hist] == [("A", "B"), ("B", "C")]


def test_varios_campos_en_una_llamada(session, formulario, user_a):
    envio = crear_envio(
        session, formulario, user_a,
        datos={"general": {"razon_social": "A", "telefono": "111"}},
    )
    svc = EnviosService(session)
    out = svc.actualizar_campos(
        user_a, envio.id,
        {"general.razon_social": "B", "general.telefono": "222"},
    )
    assert out.datos["general"] == {"razon_social": "B", "telefono": "222"}
    assert session.query(EnvioValorHistorial).filter_by(envio_id=envio.id).count() == 2


def test_envio_en_proceso_409(session, formulario, user_a):
    envio = crear_envio(session, formulario, user_a, estado="en_proceso")
    svc = EnviosService(session)
    with pytest.raises(HTTPException) as exc:
        svc.actualizar_campos(user_a, envio.id, {"general.razon_social": "X"})
    assert exc.value.status_code == 409


def test_envio_de_otro_usuario_403(session, formulario, user_a, user_b):
    envio_b = crear_envio(session, formulario, user_b)
    svc = EnviosService(session)
    with pytest.raises(HTTPException) as exc:
        svc.actualizar_campos(user_a, envio_b.id, {"general.razon_social": "X"})
    assert exc.value.status_code == 403


def test_envio_inexistente_404(session, formulario, user_a):
    svc = EnviosService(session)
    with pytest.raises(HTTPException) as exc:
        svc.actualizar_campos(user_a, 999999, {"general.razon_social": "X"})
    assert exc.value.status_code == 404


def test_listar_historial_mi_envio(session, formulario, user_a):
    envio = crear_envio(
        session, formulario, user_a, datos={"general": {"razon_social": "A"}},
    )
    svc = EnviosService(session)
    svc.actualizar_campos(user_a, envio.id, {"general.razon_social": "B"})
    items = svc.listar_historial_mi_envio(user_a, envio.id)
    assert len(items) == 1
    assert items[0].field_path == "general.razon_social"
    assert items[0].valor_nuevo == "B"


# ---------------------------------------------------------------------------
# tiene_campos_editables (listado del respondent)
# ---------------------------------------------------------------------------


def _listar_para(session, formulario, user):
    from app.services.sieej.formularios_dinamicos_service import (
        FormulariosDinamicosService,
    )

    formulario.usuarios_asignados.append(user)
    session.commit()
    items = FormulariosDinamicosService(session).listar_visibles(user)
    return next(i for i in items if i["id"] == formulario.id)


def test_listado_marca_campos_editables_en_envio_enviado(
    session, formulario, user_a
):
    crear_envio(session, formulario, user_a, estado="enviado")
    item = _listar_para(session, formulario, user_a)
    assert item["estado_envio"] == "enviado"
    assert item["tiene_campos_editables"] is True


def test_listado_no_marca_editables_si_el_envio_sigue_en_proceso(
    session, formulario, user_a
):
    crear_envio(session, formulario, user_a, estado="en_proceso")
    item = _listar_para(session, formulario, user_a)
    assert item["tiene_campos_editables"] is False


def test_listado_no_marca_editables_sin_envio(session, formulario, user_a):
    item = _listar_para(session, formulario, user_a)
    assert item["estado_envio"] == "no_iniciado"
    assert item["tiene_campos_editables"] is False


def test_listado_no_marca_editables_si_el_snapshot_no_tiene_campos_marcados(
    session, formulario, user_a
):
    envio = crear_envio(session, formulario, user_a, estado="enviado")
    envio.definicion_snapshot = {
        "version": 1,
        "steps": [
            {
                "id": "general",
                "type": "form",
                "title": "Datos generales",
                "fields": [{"name": "clave", "label": "Clave", "type": "text"}],
            }
        ],
    }
    session.commit()
    item = _listar_para(session, formulario, user_a)
    assert item["tiene_campos_editables"] is False
