import re

import pytest
from fastapi import HTTPException
from sqlalchemy import JSON, CheckConstraint, MetaData, create_engine, text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.schema import DefaultClause

from app.models.layer import Layer, Workspace
from app.models.mapalab_acceso import (
    MapalabCapaAcceso,
    MapalabGrupo,
    MapalabGrupoMiembro,
    MapalabUsuario,
)
from app.services import mapalab_acceso as svc


def _ddl_sqlite() -> MetaData:
    md = MetaData()
    for modelo in (Workspace, Layer, MapalabUsuario, MapalabGrupo, MapalabGrupoMiembro, MapalabCapaAcceso):
        tabla = modelo.__table__.to_metadata(md)
        for restriccion in [c for c in tabla.constraints if isinstance(c, CheckConstraint)]:
            tabla.constraints.discard(restriccion)
        for col in tabla.columns:
            if isinstance(col.type, (ARRAY, JSONB)):
                col.type = JSON()
            arg = getattr(col.server_default, "arg", None)
            if arg is not None and not isinstance(arg, str):
                limpio = re.sub(r"\bNOW\(\)", "CURRENT_TIMESTAMP", str(arg), flags=re.IGNORECASE)
                col.server_default = DefaultClause(text(limpio))
    return md


_engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
with _engine.connect() as _c:
    _c.execute(text("ATTACH DATABASE ':memory:' AS mapalab"))
    _c.commit()
_MD = _ddl_sqlite()
_Session = sessionmaker(bind=_engine, autoflush=False, autocommit=False)


@pytest.fixture()
def de():
    _MD.create_all(bind=_engine)
    s = _Session()
    for id_, padre, tipo in [("tema", None, "tema"), ("carpeta", "tema", "category"), ("capa", "carpeta", "leaf")]:
        s.add(Layer(id=id_, parent_id=padre, label=id_.title(), node_type=tipo))
    s.commit()
    try:
        yield s
    finally:
        s.close()
        _MD.drop_all(bind=_engine)


class TestUsuarios:
    def test_alta_por_correo(self, de):
        u = svc.crear_usuario(de, "Ana@IIEG.gob.mx", " Ana ")
        assert u["nombre"] == "Ana" and u["vinculado"] is False and u["activo"] is True

    def test_correo_repetido_sin_importar_mayusculas(self, de):
        svc.crear_usuario(de, "ana@iieg.gob.mx", None)
        with pytest.raises(HTTPException) as exc:
            svc.crear_usuario(de, "ANA@iieg.gob.mx", None)
        assert exc.value.status_code == 409

    def test_desactivar(self, de):
        u = svc.crear_usuario(de, "ana@iieg.gob.mx", None)
        assert svc.actualizar_usuario(de, u["id"], {"activo": False})["activo"] is False


class TestGrupos:
    def test_crear_con_miembros_y_contar(self, de):
        a = svc.crear_usuario(de, "a@iieg.gob.mx", None)
        g = svc.guardar_grupo(de, None, {"nombre": "Geografía", "miembros": [a["id"], a["id"]]})
        assert g["miembros"] == [a["id"]]
        assert svc.listar_usuarios(de)[0]["grupos"] == [g["id"]]

    def test_miembro_inexistente(self, de):
        with pytest.raises(HTTPException) as exc:
            svc.guardar_grupo(de, None, {"nombre": "X", "miembros": [99]})
        assert exc.value.status_code == 400

    def test_nombre_repetido(self, de):
        svc.guardar_grupo(de, None, {"nombre": "Geografía"})
        with pytest.raises(HTTPException):
            svc.guardar_grupo(de, None, {"nombre": "geografía"})

    def test_editar_reemplaza_miembros(self, de):
        a = svc.crear_usuario(de, "a@iieg.gob.mx", None)
        b = svc.crear_usuario(de, "b@iieg.gob.mx", None)
        g = svc.guardar_grupo(de, None, {"nombre": "G", "miembros": [a["id"]]})
        assert svc.guardar_grupo(de, g["id"], {"nombre": "G", "miembros": [b["id"]]})["miembros"] == [b["id"]]


class TestAccesoPorCapa:
    def test_marcar_privada_con_persona_y_grupo(self, de):
        a = svc.crear_usuario(de, "a@iieg.gob.mx", None)
        g = svc.guardar_grupo(de, None, {"nombre": "G"})
        acceso = svc.guardar_acceso(de, "carpeta", {"privada": True, "usuarios": [a["id"]], "grupos": [g["id"]]}, "admin")
        assert acceso["privada"] is True and acceso["usuarios"] == [a["id"]] and acceso["grupos"] == [g["id"]]
        assert svc.capas_privadas(de) == [{"id": "carpeta", "label": "Carpeta", "node_type": "category", "usuarios": 1, "grupos": 1}]

    def test_la_hija_sabe_de_quien_hereda(self, de):
        svc.guardar_acceso(de, "carpeta", {"privada": True}, "admin")
        assert svc.acceso_de_capa(de, "capa")["heredada_de"] == ["carpeta"]

    def test_volver_publica_borra_la_lista(self, de):
        a = svc.crear_usuario(de, "a@iieg.gob.mx", None)
        svc.guardar_acceso(de, "capa", {"privada": True, "usuarios": [a["id"]]}, "admin")
        acceso = svc.guardar_acceso(de, "capa", {"privada": False, "usuarios": [a["id"]]}, "admin")
        assert acceso["privada"] is False and acceso["usuarios"] == []

    def test_capa_inexistente(self, de):
        with pytest.raises(HTTPException) as exc:
            svc.acceso_de_capa(de, "nada")
        assert exc.value.status_code == 404

    def test_borrar_usuario_quita_su_acceso(self, de):
        a = svc.crear_usuario(de, "a@iieg.gob.mx", None)
        svc.guardar_acceso(de, "capa", {"privada": True, "usuarios": [a["id"]]}, "admin")
        svc.eliminar_usuario(de, a["id"])
        assert svc.listar_usuarios(de) == []


def test_rutas_piden_permiso(client):
    from app.core.settings import get_settings
    resp = client.get(f"{get_settings().admin_prefix}/mapalab/acceso/usuarios")
    assert resp.status_code in (401, 403)
