import importlib
import importlib.util
from pathlib import Path

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.core.security import hash_password
from app.models.sieej import (
    BasesDatos,
    CatalogoCategoriaDatos,
    CatalogoUnidadAdmin,
    Enlace,
    EnvioFormulario,
    Formulario,
    General,
)
from app.models.user import Usuario
from app.services.sieej.definicion_validator import validar_definicion


def _load_module_from_path(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


_API_ROOT = Path(__file__).resolve().parents[1]

SEED_MODULE = _load_module_from_path(
    "seed_sieej_levantamiento",
    _API_ROOT / "alembic" / "versions" / "mariachi" / "b5c6d7e8f9aa_seed_sieej_levantamiento.py",
)
backfill_module = importlib.import_module("scripts.backfill_sieej_levantamiento")

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


def test_definicion_seed_es_valida():
    """La definicion que la migration inserta debe pasar el validator."""
    definicion = SEED_MODULE._build_definicion()
    validar_definicion(definicion)


def _crear_usuario(session, username="resp_x"):
    u = Usuario(
        username=username,
        email=f"{username}@t.com",
        name=username.upper(),
        hashed_password=hash_password("testpass123"),
        role="externo",
    )
    session.add(u)
    session.commit()
    session.refresh(u)
    return u


def _crear_formulario_seed(session, creador):
    definicion = SEED_MODULE._build_definicion()
    f = Formulario(
        slug="sieej-levantamiento",
        nombre="Levantamiento SIEEJ",
        descripcion="t",
        definicion=definicion,
        estado="activo",
        publico=False,
        version=1,
        creado_por_id=creador.id,
    )
    session.add(f)
    session.commit()
    session.refresh(f)
    return f


def test_backfill_crea_envio_completo_para_user_con_datos(session):
    admin = _crear_usuario(session, "admin")
    _crear_formulario_seed(session, admin)
    user = _crear_usuario(session, "resp1")

    unidad = CatalogoUnidadAdmin(value="Secretaria de Movilidad")
    session.add(unidad)
    session.commit()
    session.refresh(unidad)

    session.add(General(
        user_id=user.id,
        unidad_admin_id=unidad.id,
        nombre_ente_gobierno="Secretaria X",
        hay_responsable=True,
        descripcion_hay_responsable="Direccion de datos",
        desafios_oportunidades="Mejorar pipelines",
        is_active=True,
    ))
    session.add(Enlace(
        user_id=user.id,
        nombres="Edgar", apellido1="Villarreal", apellido2="Padilla",
        direccion="Av. X", puesto="Lider", email="e@t.com", telefono="3331234567",
        es_tecnico=True,
        nombres_jefe="Jefe", apellido1_jefe="J", apellido2_jefe="J",
        puesto_jefe="Director", email_jefe="j@t.com",
    ))
    cat_dat = CatalogoCategoriaDatos(value="Operativos")
    session.add(cat_dat)
    session.commit()
    session.refresh(cat_dat)
    bd = BasesDatos(
        user_id=user.id,
        nombre_bd="BD Test",
        descripcion_bd="Desc",
        categoria_datos_id=cat_dat.id,
        tiene_diccionario=True,
        ruta_diccionario="/acervo/sieej-diccionarios/abc.csv",
    )
    session.add(bd)
    session.commit()

    res = backfill_module.backfill(session, dry_run=False)

    assert res["creados"] == 1
    assert res["enviados"] == 1
    assert res["archivos_creados"] == 1

    envio = (
        session.query(EnvioFormulario)
        .filter(EnvioFormulario.usuario_id == user.id)
        .first()
    )
    assert envio is not None
    assert envio.estado == "enviado"
    assert envio.datos["general"]["nombre_ente_gobierno"] == "Secretaria X"
    assert envio.datos["general"]["hay_responsable"] == "true"
    assert len(envio.datos["enlaces"]) == 1
    assert envio.datos["enlaces"][0]["es_tecnico"] == "true"
    assert len(envio.datos["bases_datos"]) == 1
    assert envio.datos["bases_datos"][0]["categoria_datos"] == "Operativos"
    assert envio.datos["bases_datos"][0]["tiene_diccionario"] == "true"
    assert envio.archivos[0].field_path == "bases_datos[0].diccionario"


def test_backfill_user_parcial_queda_en_proceso(session):
    admin = _crear_usuario(session, "admin")
    _crear_formulario_seed(session, admin)
    user = _crear_usuario(session, "resp_parcial")

    session.add(General(
        user_id=user.id,
        nombre_ente_gobierno="Secretaria",
        hay_responsable=False,
        desafios_oportunidades="Algo",
        is_active=True,
    ))
    session.commit()

    res = backfill_module.backfill(session, dry_run=False)
    assert res["creados"] == 1
    assert res["en_proceso"] == 1

    envio = (
        session.query(EnvioFormulario)
        .filter(EnvioFormulario.usuario_id == user.id)
        .first()
    )
    assert envio.estado == "en_proceso"


def test_backfill_idempotente(session):
    admin = _crear_usuario(session, "admin")
    _crear_formulario_seed(session, admin)
    user = _crear_usuario(session, "resp_idem")
    session.add(General(
        user_id=user.id,
        nombre_ente_gobierno="X",
        hay_responsable=False,
        desafios_oportunidades="Y",
        is_active=True,
    ))
    session.commit()

    r1 = backfill_module.backfill(session, dry_run=False)
    r2 = backfill_module.backfill(session, dry_run=False)
    assert r1["creados"] == 1
    assert r2["creados"] == 0
    assert r2["saltados_existentes"] == 1


def test_backfill_dry_run_no_escribe(session):
    admin = _crear_usuario(session, "admin")
    _crear_formulario_seed(session, admin)
    user = _crear_usuario(session, "resp_dry")
    session.add(General(
        user_id=user.id,
        nombre_ente_gobierno="X",
        hay_responsable=False,
        desafios_oportunidades="Y",
        is_active=True,
    ))
    session.commit()

    res = backfill_module.backfill(session, dry_run=True)
    assert res["creados"] == 1

    count = (
        session.query(EnvioFormulario)
        .filter(EnvioFormulario.usuario_id == user.id)
        .count()
    )
    assert count == 0


def test_backfill_sin_formulario_seed_devuelve_error(session):
    user = _crear_usuario(session, "x")
    session.add(General(
        user_id=user.id, nombre_ente_gobierno="x", hay_responsable=False,
        desafios_oportunidades="y", is_active=True,
    ))
    session.commit()

    res = backfill_module.backfill(session, dry_run=False)
    assert "error" in res


def test_backfill_repeater_con_show_when_dentro_del_item(session):
    """Verifica que el datos JSON producido pasa el datos_validator."""
    from app.services.sieej.datos_validator import validar_datos
    admin = _crear_usuario(session, "admin")
    f = _crear_formulario_seed(session, admin)
    user = _crear_usuario(session, "resp_v")

    session.add(General(
        user_id=user.id,
        nombre_ente_gobierno="X", hay_responsable=False,
        desafios_oportunidades="y", is_active=True,
    ))
    session.add(Enlace(
        user_id=user.id,
        nombres="A", apellido1="B", apellido2="C",
        direccion="D", puesto="E", email="x@t.com", telefono="3331234567",
        es_tecnico=True,
        nombres_jefe="J", apellido1_jefe="J", apellido2_jefe="J",
        puesto_jefe="P", email_jefe="j@t.com",
    ))
    session.add(BasesDatos(
        user_id=user.id, nombre_bd="X", descripcion_bd="y",
        tiene_diccionario=False,
    ))
    session.commit()

    backfill_module.backfill(session, dry_run=False)
    envio = session.query(EnvioFormulario).filter(EnvioFormulario.usuario_id == user.id).first()
    # El datos producido valida contra la definicion (en modo no estricto).
    validar_datos(f.definicion, envio.datos, estricto=False)
