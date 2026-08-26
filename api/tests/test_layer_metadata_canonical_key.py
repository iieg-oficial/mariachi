"""Tests del resolver de llave de las rutas de layer_metadata.

`mapalab.layer_metadata` esta llaveada por `<geoserver_workspace>:<capa>`, pero el
admin arma la llave con el alias del workspace. Cuando el alias difiere del nombre
real de GeoServer (`seguridad` -> `seguridad_y_proteccion_ciudadana`) la fila existe
y el CMS respondia 404, asi que el formulario se pintaba vacio.
"""
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.schema import DefaultClause

from app.api.routes.layer_metadata import _canonical_layer_key
from app.models.layer import Workspace

WORKSPACES = (
    ('salud', 'salud', 'salud'),
    ('seguridad', 'seguridad_y_proteccion_ciudadana', 'seguridad_y_proteccion_ciudadana'),
    ('desarrollo', 'desarrollo_social', 'desarrollo_social'),
)


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
        Workspace(alias=alias, geoserver_workspace=ws, db_schema=schema)
        for alias, ws, schema in WORKSPACES
    ])
    session.commit()
    try:
        yield session
    finally:
        session.close()
        tabla.c.created_at.server_default = original


class TestCanonicalLayerKey:
    def test_alias_distinto_se_traduce_al_workspace_de_geoserver(self, dataengine_session):
        assert _canonical_layer_key(
            dataengine_session, 'seguridad:carpetas_investigacion'
        ) == 'seguridad_y_proteccion_ciudadana:carpetas_investigacion'

    def test_alias_igual_al_workspace_no_cambia(self, dataengine_session):
        assert _canonical_layer_key(
            dataengine_session, 'salud:unidades_salud'
        ) == 'salud:unidades_salud'

    def test_llave_ya_canonica_es_idempotente(self, dataengine_session):
        llave = 'desarrollo_social:pobreza'
        assert _canonical_layer_key(dataengine_session, llave) == llave

    def test_workspace_desconocido_se_deja_intacto(self, dataengine_session):
        llave = 'inexistente:capa'
        assert _canonical_layer_key(dataengine_session, llave) == llave

    def test_llave_sin_workspace_se_deja_intacta(self, dataengine_session):
        assert _canonical_layer_key(dataengine_session, 'capa_suelta') == 'capa_suelta'

    def test_capa_con_dos_puntos_conserva_el_resto(self, dataengine_session):
        assert _canonical_layer_key(
            dataengine_session, 'desarrollo:pobreza:2020'
        ) == 'desarrollo_social:pobreza:2020'
