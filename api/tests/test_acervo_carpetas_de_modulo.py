import pytest
from fastapi import HTTPException

from app.models.acervo_bucket import AcervoBucket
from app.models.project import Project
from app.services.acervo_file_service import (
    acciones_en_bucket,
    buckets_accesibles,
    carpetas_escribibles,
    dentro_de_carpetas,
    resolve_bucket_escribible,
    resolve_bucket_or_403,
)
from tests.conftest import ADMIN_PREFIX, login_as

EDICION_MAPALAB = {"mariachi.mapalab.view", "mariachi.mapalab.update"}


def _buckets(db_session):
    proyecto = Project(slug="mapalab", name="MapaLab", is_active=True)
    otro = Project(slug="sieej", name="SIEEJ", is_active=True)
    db_session.add_all([proyecto, otro])
    db_session.commit()
    creados = {}
    for nombre, proyecto_id in (("mapalab", proyecto.id), ("iieg", proyecto.id), ("sieej", otro.id)):
        bucket = AcervoBucket(
            project_id=proyecto_id,
            acervo_bucket=nombre,
            access_key_ref=f"{nombre}-key",
            display_name=nombre,
        )
        db_session.add(bucket)
        db_session.commit()
        db_session.refresh(bucket)
        creados[nombre] = bucket
    return creados


@pytest.mark.parametrize(
    ("carpeta", "esperado"),
    [
        ("metadata/xlsx", True),
        ("/metadata/", True),
        ("metadata", True),
        ("svg/temas", True),
        ("svg", False),
        ("", False),
        ("/", False),
        ("metadata/../plugin", False),
        ("metadatos", False),
    ],
)
def test_dentro_de_carpetas(carpeta, esperado):
    assert dentro_de_carpetas(carpeta, ["metadata/", "svg/temas/"]) is esperado


def test_edicion_de_mapalab_sube_metadatos_sin_membresia(db_session, editora_user):
    bucket = _buckets(db_session)["mapalab"]
    editora_user.permissions = EDICION_MAPALAB
    resultado = resolve_bucket_escribible(
        bucket.id, editora_user, db_session, "create", carpeta="metadata/txt"
    )
    assert resultado.id == bucket.id


def test_edicion_de_mapalab_no_sube_fuera_de_sus_carpetas(db_session, editora_user):
    bucket = _buckets(db_session)["mapalab"]
    editora_user.permissions = EDICION_MAPALAB
    with pytest.raises(HTTPException) as exc:
        resolve_bucket_escribible(bucket.id, editora_user, db_session, "create", carpeta="plugin")
    assert exc.value.status_code == 403


def test_carpetas_de_modulo_no_borran_ni_mueven(db_session, editora_user):
    bucket = _buckets(db_session)["mapalab"]
    editora_user.permissions = EDICION_MAPALAB
    for accion in ("update", "delete"):
        with pytest.raises(HTTPException):
            resolve_bucket_escribible(bucket.id, editora_user, db_session, accion, carpeta="metadata")


def test_consulta_de_mapalab_lee_sus_buckets_y_no_los_ajenos(db_session, editora_user):
    buckets = _buckets(db_session)
    editora_user.permissions = {"mariachi.mapalab.view"}
    assert resolve_bucket_or_403(buckets["mapalab"].id, editora_user, db_session)
    assert resolve_bucket_or_403(buckets["iieg"].id, editora_user, db_session)
    with pytest.raises(HTTPException):
        resolve_bucket_or_403(buckets["sieej"].id, editora_user, db_session)
    visibles = {b.acervo_bucket for b in buckets_accesibles(db_session, editora_user)}
    assert visibles == {"mapalab", "iieg"}


def test_bucket_protegido_no_tiene_carpetas_de_modulo(db_session, editora_user):
    bucket = _buckets(db_session)["mapalab"]
    bucket.protegido = True
    db_session.commit()
    editora_user.permissions = EDICION_MAPALAB
    assert carpetas_escribibles(bucket, editora_user) == []


def test_acciones_y_carpetas_en_el_listado(client, db_session, editora_user):
    _buckets(db_session)
    login_as(client, editora_user, EDICION_MAPALAB)
    r = client.get(f"{ADMIN_PREFIX}/acervo-buckets")
    assert r.status_code == 200
    por_nombre = {b["acervo_bucket"]: b for b in r.json()}
    assert por_nombre["mapalab"]["acciones"] == []
    assert "metadata/" in por_nombre["mapalab"]["carpetas_escribibles"]
    assert por_nombre["iieg"]["carpetas_escribibles"] == []


def test_admin_del_acervo_tiene_todas_las_acciones(db_session, admin_user):
    bucket = _buckets(db_session)["sieej"]
    admin_user.permissions = {"mariachi.acervo.manage"}
    assert acciones_en_bucket(bucket, admin_user, db_session) == ["create", "update", "delete"]


def test_sin_acervo_ni_mapalab_no_entra(client, editora_user):
    login_as(client, editora_user, {"mariachi.portal.view"})
    assert client.get(f"{ADMIN_PREFIX}/acervo-buckets").status_code == 403
