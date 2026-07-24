import re

import pytest
from sqlalchemy import JSON, create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.schema import DefaultClause

from app.core.database import DataEngineBase
from app.models.capas_catalogo import CapaCatalogo, InstitucionCatalogo
from app.models.layer import Layer, Workspace  # noqa: F401
from app.schemas.capas_catalogo import (
    CapaCatalogoBulkUpdate,
    CapaCatalogoCreate,
    CapaCatalogoUpdate,
    InstitucionCatalogoCreate,
    InstitucionCatalogoUpdate,
)
from app.services import capas_catalogo_service as svc


def _sqlite_safe(raw: str) -> str:
    cleaned = re.sub(r"::\s*jsonb\b", "", raw.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r"\bNOW\(\)", "CURRENT_TIMESTAMP", cleaned, flags=re.IGNORECASE)
    return cleaned


_MAPALAB_TABLES = [InstitucionCatalogo.__table__, CapaCatalogo.__table__]

for _table in _MAPALAB_TABLES:
    for _col in _table.columns:
        if _col.server_default is not None:
            arg = getattr(_col.server_default, "arg", None)
            raw = str(arg) if arg is not None else None
            if raw and _sqlite_safe(raw) != raw:
                _col.server_default = DefaultClause(text(_sqlite_safe(raw)))

CapaCatalogo.__table__.c.search_tags.type = JSON()

_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
with _engine.connect() as _c:
    _c.execute(text("ATTACH DATABASE ':memory:' AS mapalab"))
    _c.commit()

_Session = sessionmaker(bind=_engine, autoflush=False, autocommit=False)


@pytest.fixture()
def session(monkeypatch):
    monkeypatch.setattr(svc, "validate_layer_against_geoserver", lambda *a, **k: None)
    DataEngineBase.metadata.create_all(bind=_engine, tables=_MAPALAB_TABLES)
    s = _Session()
    try:
        yield s
    finally:
        s.close()
        DataEngineBase.metadata.drop_all(bind=_engine, tables=_MAPALAB_TABLES)


def _crear_capa(session, layer="pozos", slug=None, nombre=None, ws="recursos", tags=None):
    data = CapaCatalogoCreate(
        workspaceAlias=ws, geoserverLayer=layer, slug=slug, nombre=nombre, searchTags=tags,
    )
    return svc.create_capa(session, data, updated_by="tester")


def _crear_institucion(session, nombre="SADER Jalisco", slug=None):
    data = InstitucionCatalogoCreate(nombre=nombre, slug=slug)
    return svc.create_institucion(session, data, updated_by="tester")


class TestSlugsCruzados:
    def test_capa_deriva_slug_del_layer(self, session):
        capa = _crear_capa(session, layer="pozos_de_agua")
        assert capa.slug == "pozos-de-agua"

    def test_capa_con_slug_repetido_falla(self, session):
        _crear_capa(session, layer="a", slug="repetido")
        with pytest.raises(ValueError, match="ya lo usa"):
            _crear_capa(session, layer="b", slug="repetido")

    def test_institucion_no_puede_chocar_con_slug_de_capa(self, session):
        _crear_capa(session, layer="sader_layer", slug="sader")
        with pytest.raises(ValueError, match="ya lo usa"):
            _crear_institucion(session, slug="sader")

    def test_capa_no_puede_chocar_con_slug_de_institucion(self, session):
        _crear_institucion(session, slug="iieg")
        with pytest.raises(ValueError, match="ya lo usa"):
            _crear_capa(session, layer="otra", slug="iieg")

    def test_slug_borrado_se_puede_reusar(self, session):
        capa = _crear_capa(session, layer="a", slug="libre")
        svc.delete_capa(session, capa, deleted_by="tester")
        inst = _crear_institucion(session, slug="libre")
        assert inst.slug == "libre"


class TestInstituciones:
    def test_slug_autogenerado_del_nombre(self, session):
        inst = _crear_institucion(session, nombre="SADER Jalisco")
        assert inst.slug == "sader-jalisco"

    def test_reorden_reescribe_orden(self, session):
        a = _crear_institucion(session, nombre="A")
        b = _crear_institucion(session, nombre="B")
        c = _crear_institucion(session, nombre="C")
        svc.reorder_instituciones(session, [c.id, a.id, b.id])
        assert [i.id for i in svc.get_instituciones(session)] == [c.id, a.id, b.id]

    def test_borrar_institucion_desasigna_sus_capas(self, session):
        inst = _crear_institucion(session, slug="sader")
        capa = _crear_capa(session, layer="pozos")
        svc.update_capa(
            session, capa, CapaCatalogoUpdate(institucionId=inst.id), updated_by="t"
        )
        assert capa.institucion_id == inst.id
        svc.delete_institucion(session, inst, deleted_by="t")
        session.refresh(capa)
        assert capa.institucion_id is None

    def test_update_rechaza_slug_de_capa(self, session):
        _crear_capa(session, layer="x", slug="ocupado")
        inst = _crear_institucion(session, slug="temporal")
        with pytest.raises(ValueError, match="ya lo usa"):
            svc.update_institucion(
                session, inst, InstitucionCatalogoUpdate(slug="ocupado"), updated_by="t"
            )


class TestBulkUpdate:
    def test_asigna_institucion_en_lote(self, session):
        inst = _crear_institucion(session, slug="sader")
        a = _crear_capa(session, layer="a")
        b = _crear_capa(session, layer="b")
        res = svc.bulk_update_capas(
            session,
            CapaCatalogoBulkUpdate(ids=[a.id, b.id], institucionId=inst.id),
            updated_by="t",
        )
        assert res["updated"] == 2
        assert a.institucion_id == inst.id and b.institucion_id == inst.id

    def test_habilita_deshabilita_en_lote(self, session):
        a = _crear_capa(session, layer="a")
        svc.bulk_update_capas(
            session, CapaCatalogoBulkUpdate(ids=[a.id], enabled=False), updated_by="t"
        )
        assert a.enabled is False

    def test_tags_modo_sumar_no_duplica(self, session):
        a = _crear_capa(session, layer="a", tags=["agua"])
        svc.bulk_update_capas(
            session,
            CapaCatalogoBulkUpdate(ids=[a.id], searchTags=["agua", "pozos"], tagsMode="add"),
            updated_by="t",
        )
        assert sorted(a.search_tags) == ["agua", "pozos"]

    def test_tags_modo_reemplazar(self, session):
        a = _crear_capa(session, layer="a", tags=["viejo"])
        svc.bulk_update_capas(
            session,
            CapaCatalogoBulkUpdate(ids=[a.id], searchTags=["nuevo"], tagsMode="replace"),
            updated_by="t",
        )
        assert a.search_tags == ["nuevo"]

    def test_institucion_inexistente_falla(self, session):
        a = _crear_capa(session, layer="a")
        with pytest.raises(ValueError, match="no existe"):
            svc.bulk_update_capas(
                session,
                CapaCatalogoBulkUpdate(ids=[a.id], institucionId=999),
                updated_by="t",
            )


class TestOrdenYListado:
    def test_capas_nuevas_van_al_final(self, session):
        a = _crear_capa(session, layer="a")
        b = _crear_capa(session, layer="b")
        assert a.orden == 0 and b.orden == 1

    def test_get_capas_ordena_por_orden(self, session):
        a = _crear_capa(session, layer="a")
        b = _crear_capa(session, layer="b")
        svc.reorder_capas(session, [b.id, a.id])
        assert [c.id for c in svc.get_capas(session)] == [b.id, a.id]
