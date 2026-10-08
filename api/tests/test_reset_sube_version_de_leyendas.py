"""El boton Vaciar caches sube la version de leyendas de todos los workspaces.

El visor la agrega a la URL de cada GetLegendGraphic: al cambiar, el gateway no encuentra la
leyenda en su cache de seis horas y la pide de nuevo a GeoServer.
"""
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.schema import DefaultClause

from app.api.routes.mosaics import _subir_version_de_leyendas
from app.models.layer import Workspace


@pytest.fixture(scope='function')
def dataengine_session():
    engine = create_engine(
        'sqlite:///:memory:',
        connect_args={'check_same_thread': False},
        poolclass=StaticPool,
    )
    with engine.connect() as conn:
        conn.execute(text("ATTACH DATABASE ':memory:' AS mapalab"))
        conn.commit()

    tabla = Workspace.__table__
    original = tabla.c.created_at.server_default
    tabla.c.created_at.server_default = DefaultClause(text('CURRENT_TIMESTAMP'))
    tabla.create(bind=engine)

    session = sessionmaker(bind=engine)()
    session.add_all([
        Workspace(alias='raster', geoserver_workspace='raster', db_schema='raster'),
        Workspace(alias='general', geoserver_workspace='general', db_schema='general', legend_version=5),
    ])
    session.commit()
    try:
        yield session
    finally:
        session.close()
        tabla.c.created_at.server_default = original


def _versiones(session) -> dict[str, int]:
    session.expire_all()
    return {w.alias: w.legend_version for w in session.query(Workspace).all()}


def test_un_workspace_nuevo_arranca_en_uno(dataengine_session) -> None:
    assert _versiones(dataengine_session)['raster'] == 1


def test_sube_la_version_de_todos_los_workspaces(dataengine_session) -> None:
    _subir_version_de_leyendas(dataengine_session)
    assert _versiones(dataengine_session) == {'raster': 2, 'general': 6}


def test_cada_clic_vuelve_a_subirla(dataengine_session) -> None:
    _subir_version_de_leyendas(dataengine_session)
    _subir_version_de_leyendas(dataengine_session)
    assert _versiones(dataengine_session)['raster'] == 3


def test_devuelve_cuantos_workspaces_toco(dataengine_session) -> None:
    assert _subir_version_de_leyendas(dataengine_session) == 2
