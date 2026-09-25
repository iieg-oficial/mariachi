import asyncio
import io

import pytest
from fastapi import HTTPException, UploadFile

from app.core.settings import get_settings
from app.models.acervo_bucket import AcervoBucket
from app.models.project import Project
from app.services.sieej import envios_service
from app.services.sieej.envios_service import EnviosService
from tests.test_sieej_mis_envios import (
    ADMIN_PREFIX,
    admin,
    client,
    crear_envio,
    crear_formulario,
    engine,
    login,
    proyecto_sieej,
    respondent_a,
    session,
)

__all__ = ["admin", "client", "engine", "proyecto_sieej", "respondent_a", "session"]

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


def _subir(session, formulario, envio, contenido: bytes, nombre: str, tipo_cliente: str):
    archivo = UploadFile(
        file=io.BytesIO(contenido), filename=nombre, headers={"content-type": tipo_cliente}
    )
    return asyncio.run(
        EnviosService(session)._subir_archivo_a_acervo(
            formulario, envio, CAMPO, "general.doc", archivo
        )
    )


def test_un_html_con_extension_pdf_no_se_sube(db_session, admin_user, externo_user, bucket):
    formulario = crear_formulario(db_session, admin_user)
    envio = crear_envio(db_session, formulario, externo_user)
    with pytest.raises(HTTPException) as exc:
        _subir(db_session, formulario, envio, HTML, "acta.pdf", "application/pdf")
    assert exc.value.status_code == 415


def test_el_mime_guardado_es_el_detectado(
    db_session, admin_user, externo_user, bucket, monkeypatch
):
    subidas: list[str | None] = []

    class AcervoFalso:
        async def upload_file(self, file, object_key, download_name=None, content_type=None):
            subidas.append(content_type)
            return f"http://fake/{object_key}"

    monkeypatch.setattr(envios_service.AcervoClient, "for_bucket", lambda fila: AcervoFalso())
    formulario = crear_formulario(db_session, admin_user)
    envio = crear_envio(db_session, formulario, externo_user)
    registro = _subir(db_session, formulario, envio, PDF, "acta.pdf", "text/html")
    assert registro.mime == "application/pdf"
    assert subidas == ["application/pdf"]


def _borrar(client, envio_id: int, csrf: str):
    return client.delete(
        f"{ADMIN_PREFIX}/formularios/mis-envios/{envio_id}", headers={"X-CSRF-Token": csrf}
    )


def test_no_se_borra_un_envio_con_la_ventana_cerrada(client, session, admin, respondent_a):
    formulario = crear_formulario(session, admin)
    envio = crear_envio(session, formulario, respondent_a)
    formulario.estado = "cerrado"
    session.commit()

    respuesta = _borrar(client, envio.id, login(client, respondent_a))
    assert respuesta.status_code == 409
    session.refresh(envio)
    assert envio.eliminado_en is None


def test_la_edicion_apagada_congela_los_envios(client, session, admin, respondent_a, monkeypatch):
    monkeypatch.setattr(get_settings(), "sieej_edicion_deshabilitada", True)
    formulario = crear_formulario(session, admin)
    envio = crear_envio(session, formulario, respondent_a)

    respuesta = _borrar(client, envio.id, login(client, respondent_a))
    assert respuesta.status_code == 409
