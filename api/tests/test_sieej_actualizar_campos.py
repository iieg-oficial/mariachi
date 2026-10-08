"""Tests de la actualizacion ligera de campos y su historial append-only.

Se prueban a nivel de servicio (`EnviosService.actualizar_campos`) para
verificar la logica de merge parcial, la seguridad de campos permitidos y el
historial append-only sin depender del flujo HTTP/login.
"""
import json

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


def test_editable_field_paths_solo_marcados():
    paths = EnviosService.editable_field_paths(DEFINICION)
    assert paths == {
        "general.razon_social": "Razon social",
        "general.telefono": "Telefono",
    }


def test_editable_field_paths_incluye_archivos_y_repeaters():
    definicion = {
        "version": 1,
        "steps": [
            {
                "id": "alta_archivos",
                "type": "form",
                "title": "Alta",
                "fields": [
                    {
                        "name": "base_de_datos",
                        "label": "Base de datos",
                        "type": "file",
                        "bucket": "sieej",
                        "editableAfterSubmit": True,
                    },
                    {"name": "nota", "label": "Nota", "type": "text"},
                ],
            },
            {
                "id": "bases_datos",
                "type": "repeater",
                "title": "Bases",
                "fields": [
                    {
                        "name": "diccionario",
                        "label": "Diccionario",
                        "type": "text",
                        "editableAfterSubmit": True,
                    }
                ],
            },
        ],
    }
    assert EnviosService.editable_field_paths(definicion) == {
        "alta_archivos.base_de_datos": "Base de datos",
        "bases_datos.diccionario": "Diccionario",
    }

    defs = EnviosService.editable_field_defs(definicion)
    assert EnviosService.resolver_editable(defs, "bases_datos[0].diccionario")
    assert EnviosService.resolver_editable(defs, "bases_datos.diccionario") is None
    assert EnviosService.resolver_editable(defs, "alta_archivos.base_de_datos")
    assert EnviosService.resolver_editable(defs, "alta_archivos[0].base_de_datos") is None


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
    assert items[0]["field_path"] == "general.razon_social"
    assert items[0]["valor_nuevo"] == "B"
    assert items[0]["origen"] == "correccion"
    assert items[0]["actor_nombre"] is None


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


# ---------------------------------------------------------------------------
# campos de repeater y de archivo
# ---------------------------------------------------------------------------


DEFINICION_MIXTA = {
    "version": 1,
    "steps": [
        {
            "id": "alta_archivos",
            "type": "form",
            "title": "Alta de archivos",
            "fields": [
                {
                    "name": "base_de_datos",
                    "label": "Base de datos",
                    "type": "file",
                    "bucket": "sieej",
                    "editableAfterSubmit": True,
                },
                {
                    "name": "nota",
                    "label": "Nota",
                    "type": "text",
                    "editableAfterSubmit": True,
                },
            ],
        },
        {
            "id": "bases_datos",
            "type": "repeater",
            "title": "Bases de datos",
            "fields": [
                {
                    "name": "diccionario",
                    "label": "Diccionario",
                    "type": "text",
                    "editableAfterSubmit": True,
                },
                {"name": "fijo", "label": "Fijo", "type": "text"},
            ],
        },
    ],
}


@pytest.fixture(scope="function")
def envio_mixto(session, formulario, user_a):
    envio = crear_envio(
        session, formulario, user_a,
        datos={
            "alta_archivos": {"nota": "vieja"},
            "bases_datos": [{"diccionario": "d1", "fijo": "f1"}],
        },
    )
    envio.definicion_snapshot = DEFINICION_MIXTA
    session.commit()
    session.refresh(envio)
    return envio


def test_actualiza_un_campo_dentro_de_un_repeater(session, envio_mixto, user_a):
    svc = EnviosService(session)
    out = svc.actualizar_campos(
        user_a, envio_mixto.id, {"bases_datos[0].diccionario": "d2"}
    )

    assert out.datos["bases_datos"][0]["diccionario"] == "d2"
    assert out.datos["bases_datos"][0]["fijo"] == "f1"

    hist = session.query(EnvioValorHistorial).filter_by(envio_id=envio_mixto.id).all()
    assert len(hist) == 1
    assert hist[0].field_path == "bases_datos[0].diccionario"
    assert hist[0].field_label == "Diccionario"
    assert hist[0].valor_anterior == "d1"
    assert hist[0].valor_nuevo == "d2"


def test_campo_de_repeater_sin_indice_es_rechazado(session, envio_mixto, user_a):
    svc = EnviosService(session)
    with pytest.raises(HTTPException) as exc:
        svc.actualizar_campos(user_a, envio_mixto.id, {"bases_datos.diccionario": "x"})
    assert exc.value.status_code == 422


def test_indice_inexistente_en_repeater_es_rechazado(session, envio_mixto, user_a):
    svc = EnviosService(session)
    with pytest.raises(HTTPException) as exc:
        svc.actualizar_campos(
            user_a, envio_mixto.id, {"bases_datos[7].diccionario": "x"}
        )
    assert exc.value.status_code == 422
    assert exc.value.detail["errores"][0]["error"] == "el elemento no existe"


def test_campo_no_marcado_del_repeater_es_rechazado(session, envio_mixto, user_a):
    svc = EnviosService(session)
    with pytest.raises(HTTPException) as exc:
        svc.actualizar_campos(user_a, envio_mixto.id, {"bases_datos[0].fijo": "x"})
    assert exc.value.status_code == 422


def test_archivo_no_se_edita_por_actualizar_campos(session, envio_mixto, user_a):
    svc = EnviosService(session)
    with pytest.raises(HTTPException) as exc:
        svc.actualizar_campos(
            user_a,
            envio_mixto.id,
            {"alta_archivos.base_de_datos": {"url_publica": "http://x/y.csv"}},
        )
    assert exc.value.status_code == 422
    assert "actualizar-archivo" in exc.value.detail["errores"][0]["error"]


def test_actualizar_archivo_rechaza_campo_no_editable(session, envio_mixto, user_a):
    import asyncio

    svc = EnviosService(session)
    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            svc.actualizar_archivo(user_a, envio_mixto.id, "alta_archivos.nota", None)
        )
    assert exc.value.status_code == 422


def test_actualizar_archivo_rechaza_envio_de_otro_usuario(
    session, envio_mixto, user_b
):
    import asyncio

    svc = EnviosService(session)
    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            svc.actualizar_archivo(
                user_b, envio_mixto.id, "alta_archivos.base_de_datos", None
            )
        )
    assert exc.value.status_code == 403


def test_campo_marcado_editable_despues_del_envio_ya_es_editable(
    session, formulario, user_a
):
    """La marca es politica del admin, no contrato de datos: activarla debe
    alcanzar a los envios ya enviados, que son los que se quieren corregir."""
    envio = crear_envio(
        session, formulario, user_a, datos={"general": {"clave": "K1"}},
    )
    assert EnviosService.editable_field_paths(envio.definicion_snapshot) == {
        "general.razon_social": "Razon social",
        "general.telefono": "Telefono",
    }

    vigente = json.loads(json.dumps(DEFINICION))
    vigente["steps"][0]["fields"][1]["editableAfterSubmit"] = True
    formulario.definicion = vigente
    session.commit()

    svc = EnviosService(session)
    out = svc.actualizar_campos(user_a, envio.id, {"general.clave": "K2"})
    assert out.datos["general"]["clave"] == "K2"

    hist = session.query(EnvioValorHistorial).filter_by(envio_id=envio.id).all()
    assert [h.field_path for h in hist] == ["general.clave"]


def test_marca_retirada_en_la_vigente_deja_de_ser_editable(
    session, formulario, user_a
):
    envio = crear_envio(session, formulario, user_a)
    vigente = json.loads(json.dumps(DEFINICION))
    vigente["steps"][0]["fields"][0]["editableAfterSubmit"] = False
    formulario.definicion = vigente
    session.commit()

    svc = EnviosService(session)
    with pytest.raises(HTTPException) as exc:
        svc.actualizar_campos(user_a, envio.id, {"general.razon_social": "X"})
    assert exc.value.status_code == 422


def test_snapshot_servido_lleva_las_marcas_vigentes(session, formulario, user_a):
    envio = crear_envio(session, formulario, user_a)
    vigente = json.loads(json.dumps(DEFINICION))
    vigente["steps"][0]["fields"][1]["editableAfterSubmit"] = True

    fusionado = EnviosService.snapshot_con_editables_vigentes(
        envio.definicion_snapshot, vigente
    )
    campos = {f["name"]: f for f in fusionado["steps"][0]["fields"]}
    assert campos["clave"]["editableAfterSubmit"] is True
    assert envio.definicion_snapshot["steps"][0]["fields"][1].get(
        "editableAfterSubmit"
    ) is None


# ---------------------------------------------------------------------------
# los valores de archivo los escribe el servidor, no el cliente
# ---------------------------------------------------------------------------


DEFINICION_ARCHIVO = {
    "version": 1,
    "steps": [
        {
            "id": "alta",
            "type": "form",
            "title": "Alta",
            "fields": [
                {
                    "name": "base",
                    "label": "Base",
                    "type": "file",
                    "bucket": "sieej",
                },
                {"name": "nota", "label": "Nota", "type": "text"},
            ],
        }
    ],
}

ARCHIVO_SERVIDOR = {
    "field_path": "alta.base",
    "url_publica": "/api/mariachi/acervo/proxy/4/mundial/unico/envio-1/alta.base/x.xlsx",
    "object_key": "mundial/unico/envio-1/alta.base/x.xlsx",
    "filename_original": "Base.xlsx",
    "mime": "application/vnd.ms-excel",
    "size_bytes": 10,
}


@pytest.fixture(scope="function")
def formulario_archivo(session, admin):
    f = Formulario(
        slug="form-archivo",
        nombre="Form Archivo",
        definicion=DEFINICION_ARCHIVO,
        estado="activo",
        version=1,
        creado_por_id=admin.id,
    )
    session.add(f)
    session.commit()
    session.refresh(f)
    return f


def _envio_con_archivo(session, formulario, user):
    envio = crear_envio(
        session, formulario, user, estado="en_proceso",
        datos={"alta": {"base": dict(ARCHIVO_SERVIDOR), "nota": "n1"}},
    )
    envio.definicion_snapshot = DEFINICION_ARCHIVO
    session.commit()
    return envio


def test_el_cliente_no_puede_reescribir_el_valor_de_un_archivo(
    session, formulario_archivo, user_a
):
    _envio_con_archivo(session, formulario_archivo, user_a)
    svc = EnviosService(session)
    out = svc.actualizar(
        formulario_archivo,
        user_a,
        {"alta": {"base": {"url_publica": "http://malicioso/x", "filename": "otro"}, "nota": "n2"}},
        0,
        enviar=False,
    )
    assert out.datos["alta"]["base"] == ARCHIVO_SERVIDOR
    assert out.datos["alta"]["nota"] == "n2"


def test_el_cliente_si_puede_quitar_un_archivo(session, formulario_archivo, user_a):
    _envio_con_archivo(session, formulario_archivo, user_a)
    svc = EnviosService(session)
    out = svc.actualizar(
        formulario_archivo,
        user_a,
        {"alta": {"base": None, "nota": "n1"}},
        0,
        enviar=False,
    )
    assert out.datos["alta"].get("base") is None


def test_el_respaldo_no_puede_tumbar_el_envio(session, formulario, user_a, monkeypatch):
    """El respaldo en Acervo es best-effort: si falla (bucket sin configurar,
    Acervo caido) el envio se guarda igual. La fuente de verdad es la BD."""
    envio = crear_envio(session, formulario, user_a, estado="en_proceso")

    def explota(_envio):
        raise RuntimeError("acervo caido")

    svc = EnviosService(session)
    monkeypatch.setattr(svc, "_escribir_respaldo", explota)

    out = svc.actualizar(
        formulario,
        user_a,
        {"general": {"razon_social": "Acme", "telefono": "3312345678"}},
        0,
        enviar=True,
    )
    assert out.estado == "enviado"
    assert svc.respaldar_envio(envio) is None


# ---------------------------------------------------------------------------
# altas de elementos y nombre de la pestaña
# ---------------------------------------------------------------------------


def _hist(session, envio):
    return (
        session.query(EnvioValorHistorial)
        .filter(EnvioValorHistorial.envio_id == envio.id)
        .order_by(EnvioValorHistorial.id)
        .all()
    )


def test_alta_de_un_elemento_al_final(session, envio_mixto, user_a):
    svc = EnviosService(session)
    out = svc.actualizar_campos(
        user_a, envio_mixto.id,
        {"bases_datos[1].diccionario": "d2", "bases_datos[1].fijo": "f2"},
    )
    assert len(out.datos["bases_datos"]) == 2
    assert out.datos["bases_datos"][1] == {
        "__agregado": True, "diccionario": "d2", "fijo": "f2",
    }
    assert out.datos["bases_datos"][0] == {"diccionario": "d1", "fijo": "f1"}
    hist = _hist(session, out)
    assert {h.field_path for h in hist} == {
        "bases_datos[1].diccionario", "bases_datos[1].fijo",
    }
    assert all(h.valor_anterior is None for h in hist)


def test_alta_de_dos_elementos_consecutivos(session, envio_mixto, user_a):
    svc = EnviosService(session)
    out = svc.actualizar_campos(
        user_a, envio_mixto.id,
        {"bases_datos[1].diccionario": "d2", "bases_datos[2].diccionario": "d3"},
    )
    assert [i.get("diccionario") for i in out.datos["bases_datos"]] == ["d1", "d2", "d3"]


def test_alta_con_hueco_se_rechaza(session, envio_mixto, user_a):
    svc = EnviosService(session)
    with pytest.raises(HTTPException) as exc:
        svc.actualizar_campos(user_a, envio_mixto.id, {"bases_datos[2].diccionario": "x"})
    assert exc.value.status_code == 422
    assert exc.value.detail["errores"][0]["error"] == "el elemento no existe"
    session.refresh(envio_mixto)
    assert len(envio_mixto.datos["bases_datos"]) == 1


def test_alta_respeta_max_items(session, envio_mixto, user_a):
    definicion = json.loads(json.dumps(DEFINICION_MIXTA))
    definicion["steps"][1]["maxItems"] = 1
    envio_mixto.definicion_snapshot = definicion
    session.commit()
    svc = EnviosService(session)
    with pytest.raises(HTTPException) as exc:
        svc.actualizar_campos(user_a, envio_mixto.id, {"bases_datos[1].diccionario": "x"})
    assert "maximo de 1" in exc.value.detail["errores"][0]["error"]


def test_alta_sin_valores_no_deja_elemento_fantasma(session, envio_mixto, user_a):
    svc = EnviosService(session)
    out = svc.actualizar_campos(user_a, envio_mixto.id, {"bases_datos[1].diccionario": None})
    assert len(out.datos["bases_datos"]) == 1


def test_en_un_agregado_se_completa_lo_que_sigue_vacio(session, envio_mixto, user_a):
    svc = EnviosService(session)
    svc.actualizar_campos(user_a, envio_mixto.id, {"bases_datos[1].diccionario": "d2"})
    out = svc.actualizar_campos(user_a, envio_mixto.id, {"bases_datos[1].fijo": "f2"})
    assert out.datos["bases_datos"][1]["fijo"] == "f2"


def test_en_un_agregado_lo_ya_lleno_se_bloquea_como_en_los_demas(
    session, envio_mixto, user_a
):
    svc = EnviosService(session)
    svc.actualizar_campos(
        user_a, envio_mixto.id,
        {"bases_datos[1].diccionario": "d2", "bases_datos[1].fijo": "f2"},
    )
    with pytest.raises(HTTPException) as exc:
        svc.actualizar_campos(user_a, envio_mixto.id, {"bases_datos[1].fijo": "otro"})
    assert exc.value.detail["errores"][0]["error"] == "campo no editable"
    out = svc.actualizar_campos(user_a, envio_mixto.id, {"bases_datos[1].diccionario": "d9"})
    assert out.datos["bases_datos"][1]["diccionario"] == "d9"


def test_en_un_elemento_original_lo_vacio_no_se_completa(session, formulario, user_a):
    envio = crear_envio(
        session, formulario, user_a, datos={"bases_datos": [{"diccionario": "d1"}]},
    )
    envio.definicion_snapshot = DEFINICION_MIXTA
    session.commit()
    svc = EnviosService(session)
    with pytest.raises(HTTPException) as exc:
        svc.actualizar_campos(user_a, envio.id, {"bases_datos[0].fijo": "f"})
    assert exc.value.status_code == 422


def test_el_nombre_de_la_pestana_se_edita_sin_marca(session, envio_mixto, user_a):
    svc = EnviosService(session)
    out = svc.actualizar_campos(
        user_a, envio_mixto.id, {"bases_datos[0].__etiqueta": "  Planteles  "},
    )
    assert out.datos["bases_datos"][0]["__etiqueta"] == "Planteles"
    hist = _hist(session, out)
    assert hist[-1].field_label == "Nombre de la pestaña"
    assert hist[-1].valor_nuevo == "Planteles"


def test_el_nombre_vacio_regresa_al_numero(session, envio_mixto, user_a):
    svc = EnviosService(session)
    svc.actualizar_campos(user_a, envio_mixto.id, {"bases_datos[0].__etiqueta": "Planteles"})
    out = svc.actualizar_campos(user_a, envio_mixto.id, {"bases_datos[0].__etiqueta": "   "})
    assert out.datos["bases_datos"][0]["__etiqueta"] is None


def test_el_nombre_se_recorta_a_sesenta(session, envio_mixto, user_a):
    svc = EnviosService(session)
    out = svc.actualizar_campos(user_a, envio_mixto.id, {"bases_datos[0].__etiqueta": "x" * 90})
    assert len(out.datos["bases_datos"][0]["__etiqueta"]) == 60


def test_el_nombre_debe_ser_texto(session, envio_mixto, user_a):
    svc = EnviosService(session)
    with pytest.raises(HTTPException) as exc:
        svc.actualizar_campos(user_a, envio_mixto.id, {"bases_datos[0].__etiqueta": 123})
    assert "texto" in exc.value.detail["errores"][0]["error"]


def test_un_paso_que_no_es_repeater_no_tiene_nombre_de_pestana(
    session, envio_mixto, user_a
):
    svc = EnviosService(session)
    with pytest.raises(HTTPException):
        svc.actualizar_campos(user_a, envio_mixto.id, {"alta_archivos.__etiqueta": "x"})


def test_alta_con_nombre_de_pestana(session, envio_mixto, user_a):
    svc = EnviosService(session)
    out = svc.actualizar_campos(
        user_a, envio_mixto.id,
        {"bases_datos[1].__etiqueta": "Nuevo", "bases_datos[1].diccionario": "d2"},
    )
    assert out.datos["bases_datos"][1]["__etiqueta"] == "Nuevo"


def test_un_archivo_vacio_de_un_agregado_se_puede_subir(session):
    definicion = {
        "steps": [{
            "id": "conjuntos",
            "type": "repeater",
            "fields": [
                {"name": "nota", "type": "text", "editableAfterSubmit": True},
                {"name": "carga", "type": "file", "bucket": "sieej"},
            ],
        }],
    }
    svc = EnviosService(session)
    defs = svc.editable_field_defs(definicion)
    todos = svc.editable_field_defs(definicion, solo_editables=False)
    agregado = {"conjuntos": [{"nota": "a"}, {"__agregado": True, "nota": "b"}]}

    meta, error = svc._resolver_actualizable(defs, todos, agregado, "conjuntos[1].carga")
    assert error is None and meta["type"] == "file"

    meta, error = svc._resolver_actualizable(defs, todos, agregado, "conjuntos[0].carga")
    assert meta is None and error == "campo no editable"

    agregado["conjuntos"][1]["carga"] = {"filename": "x.csv"}
    meta, error = svc._resolver_actualizable(defs, todos, agregado, "conjuntos[1].carga")
    assert meta is None
