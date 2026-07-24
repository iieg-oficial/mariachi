"""Tests de la apertura periodica de formularios SIEEJ.

Cubre las funciones puras del motor (clave/ventana/ventana abierta/proxima) y
el flujo con base de datos (tick que abre/cierra, un envio por periodo, gating
por ventana, expiracion al cierre, faltantes y export de la bitacora).

Se prueba en la capa de servicio (sin cliente HTTP) para no depender del boot
de la app. El webhook se anula; `utcnow` se parchea por modulo para controlar
el tiempo.
"""
from datetime import datetime

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.services.sieej.envios_service as envios_mod
import app.services.sieej.notificaciones_service as notif_mod
import app.services.sieej.periodos_service as periodos_mod
from app.core.database import Base
from app.models.sieej import (
    EnvioFormulario,
    Formulario,
    FormularioPeriodo,
    Notificacion,
    formulario_usuario,
)
from app.models.user import Usuario
from app.services.sieej.envios_service import EnviosService
from app.services.sieej.notificaciones_service import NotificacionesService
from app.services.sieej.periodos_service import (
    PeriodicidadInvalidaError,
    PeriodosService,
    proxima_apertura,
    validar_periodicidad,
    ventana_abierta,
)

SIEEJ_TABLES = [t for t in Base.metadata.sorted_tables if t.schema == "sieej"]
# Solo `usuarios` del schema publico: crear todas las tablas publicas arrastra
# ciclos de FK ajenos (reportes) que rompen el create_all en sqlite.
NEEDED_TABLES = [Usuario.__table__] + SIEEJ_TABLES

MENSUAL = {"frecuencia": "mensual", "dia_inicio": 1, "duracion_dias": 7}
DEF = {
    "version": 1,
    "steps": [
        {
            "id": "g",
            "type": "form",
            "title": "G",
            "fields": [{"name": "a", "label": "A", "type": "text"}],
        }
    ],
}


# --------------------------------------------------------------------------
# Funciones puras
# --------------------------------------------------------------------------

def test_ventana_abierta_dentro_y_fuera():
    assert ventana_abierta(MENSUAL, datetime(2026, 3, 3))[0] == "2026-03"
    assert ventana_abierta(MENSUAL, datetime(2026, 3, 20)) is None


def test_proxima_apertura_cuando_cerrado():
    assert proxima_apertura(MENSUAL, datetime(2026, 3, 20)) == datetime(2026, 4, 1)
    assert proxima_apertura(MENSUAL, datetime(2026, 3, 3)) is None


def test_claves_por_frecuencia():
    tri = {"frecuencia": "trimestral", "dia_inicio": 1, "duracion_dias": 7}
    sem = {"frecuencia": "semestral", "dia_inicio": 1, "duracion_dias": 7}
    anual = {"frecuencia": "anual", "dia_inicio": 1, "duracion_dias": 7}
    assert ventana_abierta(tri, datetime(2026, 4, 2))[0] == "2026-T2"
    assert ventana_abierta(sem, datetime(2026, 7, 3))[0] == "2026-S2"
    assert ventana_abierta(anual, datetime(2026, 1, 4))[0] == "2026"


def test_ancla_pospone_primera_ventana():
    per = {**MENSUAL, "ancla": "2026-07-01"}
    assert proxima_apertura(per, datetime(2026, 3, 3)) == datetime(2026, 7, 1)


@pytest.mark.parametrize(
    "bad",
    [
        {"frecuencia": "diario"},
        {"frecuencia": "mensual", "dia_inicio": 31},
        {"frecuencia": "mensual", "dia_inicio": 25, "duracion_dias": 10},
        {"frecuencia": "mensual", "ancla": "no-es-fecha"},
    ],
)
def test_validar_periodicidad_rechaza(bad):
    with pytest.raises(PeriodicidadInvalidaError):
        validar_periodicidad(bad)


def test_validar_periodicidad_normaliza():
    norm = validar_periodicidad(
        {"frecuencia": "mensual", "dia_inicio": 1, "duracion_dias": 7, "ancla": "2026-07-01T00:00:00"}
    )
    assert norm == {
        "frecuencia": "mensual",
        "dia_inicio": 1,
        "duracion_dias": 7,
        "ancla": "2026-07-01",
    }


# --------------------------------------------------------------------------
# Flujo con base de datos
# --------------------------------------------------------------------------

@pytest.fixture
def engine():
    eng = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    with eng.connect() as conn:
        conn.execute(text("ATTACH DATABASE ':memory:' AS sieej"))
        conn.commit()
    Base.metadata.create_all(bind=eng, tables=NEEDED_TABLES)
    yield eng
    Base.metadata.drop_all(bind=eng, tables=NEEDED_TABLES)


@pytest.fixture
def db(engine):
    session = sessionmaker(bind=engine)()
    yield session
    session.close()


@pytest.fixture(autouse=True)
def _sin_webhook(monkeypatch):
    monkeypatch.setattr(NotificacionesService, "_webhook", lambda self, *a, **k: None)


def _reloj(monkeypatch, dt):
    for mod in (periodos_mod, envios_mod, notif_mod):
        monkeypatch.setattr(mod, "utcnow", lambda dt=dt: dt)


def _seed(db):
    creador = Usuario(username="c", email="c@t.com", name="C", hashed_password="x", role="tetlamamakani")
    r1 = Usuario(username="r1", email="r1@t.com", name="R1", hashed_password="x", role="externo")
    r2 = Usuario(username="r2", email="r2@t.com", name="R2", hashed_password="x", role="externo")
    r3 = Usuario(username="r3", email="r3@t.com", name="R3", hashed_password="x", role="externo")
    db.add_all([creador, r1, r2, r3])
    db.flush()
    f = Formulario(
        slug="mensual", nombre="Reporte", definicion=DEF, estado="activo",
        periodicidad=MENSUAL, version=1, creado_por_id=creador.id,
    )
    db.add(f)
    db.flush()
    for r in (r1, r2, r3):
        db.execute(formulario_usuario.insert().values(formulario_id=f.id, usuario_id=r.id))
    db.commit()
    return f, (r1, r2, r3)


def test_tick_abre_notifica_y_gating(db, monkeypatch):
    f, _ = _seed(db)
    _reloj(monkeypatch, datetime(2026, 3, 3, 12))
    res = PeriodosService(db).tick(datetime(2026, 3, 3, 12))
    assert res["aperturas_notificadas"] == 1
    claves = {(p.clave, p.estado) for p in db.query(FormularioPeriodo).all()}
    assert ("2026-03", "abierto") in claves
    assert ("2026-04", "programado") in claves
    assert db.query(Notificacion).filter_by(tipo="apertura").count() == 1
    assert EnviosService._formulario_acepta_cambios(f) is True


def test_un_envio_por_periodo(db, monkeypatch):
    f, (r1, r2, _) = _seed(db)
    _reloj(monkeypatch, datetime(2026, 3, 3, 12))
    PeriodosService(db).tick(datetime(2026, 3, 3, 12))
    e1 = EnviosService(db).get_o_iniciar(f, r1)
    e2 = EnviosService(db).get_o_iniciar(f, r2)
    assert e1.periodo_id is not None
    assert e1.periodo_id == e2.periodo_id
    # segundo get del mismo usuario devuelve el mismo envio del periodo
    assert EnviosService(db).get_o_iniciar(f, r1).id == e1.id


def test_cierre_expira_y_reporta_faltantes(db, monkeypatch):
    f, (r1, r2, r3) = _seed(db)
    _reloj(monkeypatch, datetime(2026, 3, 3, 12))
    PeriodosService(db).tick(datetime(2026, 3, 3, 12))
    e1 = EnviosService(db).get_o_iniciar(f, r1)
    e2 = EnviosService(db).get_o_iniciar(f, r2)  # queda en_proceso
    e1.estado = "enviado"
    db.commit()

    _reloj(monkeypatch, datetime(2026, 3, 10, 12))
    res = PeriodosService(db).tick(datetime(2026, 3, 10, 12))
    assert res["cierres_notificados"] == 1
    assert res["envios_expirados"] == 1
    assert db.get(EnvioFormulario, e2.id).estado == "expirado"
    assert EnviosService._formulario_acepta_cambios(f) is False

    falt = db.query(Notificacion).filter_by(tipo="faltantes").first()
    assert falt.payload["total_asignados"] == 3
    assert falt.payload["entregados"] == 1
    assert {x["name"] for x in falt.payload["faltantes"]} == {"R2", "R3"}


def test_tick_idempotente(db, monkeypatch):
    _seed(db)
    _reloj(monkeypatch, datetime(2026, 3, 10, 12))
    PeriodosService(db).tick(datetime(2026, 3, 10, 12))
    res = PeriodosService(db).tick(datetime(2026, 3, 10, 12))
    assert res["aperturas_notificadas"] == 0
    assert res["cierres_notificados"] == 0


def test_exportar_bitacora(db, monkeypatch):
    f, _ = _seed(db)
    _reloj(monkeypatch, datetime(2026, 3, 3, 12))
    PeriodosService(db).tick(datetime(2026, 3, 3, 12))
    csv_bytes, media_csv, ext_csv = NotificacionesService(db).exportar(f.id, "csv")
    xlsx_bytes, _media, ext_xlsx = NotificacionesService(db).exportar(f.id, "xlsx")
    assert ext_csv == "csv" and ext_xlsx == "xlsx"
    assert b"Apertura" in csv_bytes
    assert len(xlsx_bytes) > 0
