"""Un bucket protegido no acepta escrituras desde el explorador de Acervo.

El contenido de esos buckets lo gestiona una aplicacion (SIEEJ guarda ahi las
entregas de las dependencias y referencia la clave desde `envio_archivo` y
`envio.datos`), asi que borrarlo o moverlo a mano deja registros apuntando a
objetos inexistentes.
"""
import pytest
from fastapi import HTTPException

from app.models.acervo_bucket import AcervoBucket
from app.models.user import Usuario
from app.services import acervo_file_service


class _Query:
    def __init__(self, resultado):
        self._resultado = resultado

    def filter(self, *_args, **_kwargs):
        return self

    def first(self):
        return self._resultado


class _Session:
    def __init__(self, bucket):
        self._bucket = bucket

    def query(self, modelo):
        if modelo is AcervoBucket:
            return _Query(self._bucket)
        return _Query(None)


def _bucket(protegido: bool) -> AcervoBucket:
    return AcervoBucket(
        id=4,
        project_id=1,
        acervo_bucket="sieej",
        access_key_ref="ACERVO_SIEEJ",
        display_name="SIEEJ",
        is_public=False,
        is_active=True,
        protegido=protegido,
    )


def _admin() -> Usuario:
    usuario = Usuario(
        id=1, username="admin", email="a@b.c", name="Admin", role="tetlamamakani"
    )
    usuario.permissions = {"mariachi.acervo.manage"}
    return usuario


def test_un_bucket_protegido_rechaza_la_escritura_incluso_al_admin():
    db = _Session(_bucket(protegido=True))
    with pytest.raises(HTTPException) as exc:
        acervo_file_service.resolve_bucket_escribible(4, _admin(), db, "update")
    assert exc.value.status_code == 409
    assert "protegido" in exc.value.detail


def test_un_bucket_protegido_si_se_puede_leer():
    db = _Session(_bucket(protegido=True))
    assert acervo_file_service.resolve_bucket_or_403(4, _admin(), db).id == 4


def test_un_bucket_normal_sigue_siendo_escribible():
    db = _Session(_bucket(protegido=False))
    assert acervo_file_service.resolve_bucket_escribible(4, _admin(), db, "update").id == 4
