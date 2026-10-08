import asyncio
import io

import pytest
from fastapi import HTTPException, UploadFile

from app.models.acervo_bucket import AcervoBucket
from app.models.project import Project
from app.services.sieej import envios_service
from app.services.sieej.envios_service import EnviosService
from tests.test_sieej_mis_envios import crear_envio, crear_formulario

HTML = b"<html><body><script>alert(1)</script></body></html>"
PDF = b"%PDF-1.7\n%\xe2\xe3\xcf\xd3\n"
CAMPO = {"name": "doc", "type": "file", "bucket": "sieej", "accept": [".pdf"]}


@pytest.fixture
def bucket(db_session):
    proyecto = Project(slug="sieej", name="SIEEJ", is_active=True)
    db_session.add(proyecto)
    db_session.commit()
    fila = AcervoBucket(
        project_id=proyecto.id,
        acervo_bucket="sieej",
        access_key_ref="ACERVO_SIEEJ",
        display_name="SIEEJ",
    )
    db_session.add(fila)
    db_session.commit()
    return fila


@pytest.fixture
def subidas(monkeypatch):
    registro: list[str | None] = []

    class AcervoFalso:
        async def upload_file(self, file, object_key, download_name=None, content_type=None):
            registro.append(content_type)
            return f"http://fake/{object_key}"

    monkeypatch.setattr(envios_service.AcervoClient, "for_bucket", lambda fila: AcervoFalso())
    return registro


def _subir(session, formulario, envio, contenido: bytes, nombre: str, tipo_cliente: str):
    archivo = UploadFile(
        file=io.BytesIO(contenido), filename=nombre, headers={"content-type": tipo_cliente}
    )
    return asyncio.run(
        EnviosService(session)._subir_archivo_a_acervo(
            formulario, envio, CAMPO, "general.doc", archivo
        )
    )


def test_un_html_con_extension_pdf_no_se_sube(
    db_session, admin_user, externo_user, bucket, subidas
):
    formulario = crear_formulario(db_session, admin_user)
    envio = crear_envio(db_session, formulario, externo_user)
    with pytest.raises(HTTPException) as exc:
        _subir(db_session, formulario, envio, HTML, "acta.pdf", "application/pdf")
    assert exc.value.status_code == 415
    assert subidas == []


def test_un_pdf_con_extension_ajena_no_se_sube(
    db_session, admin_user, externo_user, bucket, subidas
):
    formulario = crear_formulario(db_session, admin_user)
    envio = crear_envio(db_session, formulario, externo_user)
    with pytest.raises(HTTPException) as exc:
        _subir(db_session, formulario, envio, PDF, "acta.html", "application/pdf")
    assert exc.value.status_code == 415


def test_el_mime_guardado_es_el_detectado(
    db_session, admin_user, externo_user, bucket, subidas
):
    formulario = crear_formulario(db_session, admin_user)
    envio = crear_envio(db_session, formulario, externo_user)
    registro = _subir(db_session, formulario, envio, PDF, "acta.pdf", "text/html")
    assert registro.mime == "application/pdf"
    assert subidas == ["application/pdf"]
