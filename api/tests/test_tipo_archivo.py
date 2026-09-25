import io

import pytest
from fastapi import UploadFile

from app.services import tipo_archivo

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32
PDF = b"%PDF-1.7\n%\xe2\xe3\xcf\xd3\n"
ZIP = b"PK\x03\x04" + b"\x00" * 32
HTML = b"<!DOCTYPE html><html><body><script>alert(1)</script></body></html>"
SVG = b'<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'


@pytest.mark.parametrize(
    ("cabecera", "nombre", "esperado"),
    [
        (PNG, "foto.png", "image/png"),
        (PNG, "foto.pdf", "image/png"),
        (PDF, "doc.pdf", "application/pdf"),
        (ZIP, "tabla.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
        (ZIP, "paquete.zip", "application/zip"),
        (HTML, "reporte.pdf", "text/html"),
        (SVG, "logo.svg", "image/svg+xml"),
        (b"clave,nombre\n14001,Acatic\n", "municipios.csv", "text/csv"),
        (b"hola", "nota.txt", "text/plain"),
        (b"\x00\x01\x02\x03\xff", "datos.shp", "application/octet-stream"),
    ],
)
def test_detecta_el_tipo_por_contenido(cabecera, nombre, esperado):
    assert tipo_archivo.detectar_mime(cabecera, nombre) == esperado


def test_el_content_type_del_cliente_no_cuenta():
    archivo = UploadFile(
        file=io.BytesIO(HTML), filename="informe.pdf", headers={"content-type": "application/pdf"}
    )
    assert tipo_archivo.detectar_mime_upload(archivo) == "text/html"
    assert archivo.file.tell() == 0


@pytest.mark.parametrize(
    ("nombre", "detectado", "accept", "permitido"),
    [
        ("informe.pdf", "application/pdf", [".pdf"], True),
        ("informe.pdf", "text/html", [".pdf"], False),
        ("informe.pdf", "text/html", ["application/pdf"], False),
        ("informe.html", "text/html", ["application/pdf"], False),
        ("informe.pdf", "application/pdf", ["application/pdf"], True),
        ("foto.png", "image/png", ["image/*"], True),
        ("logo.svg", "image/svg+xml", ["image/*"], False),
        ("foto.png", "text/html", ["image/*"], False),
        ("tabla.csv", "text/csv", [".csv", ".xlsx"], True),
        ("tabla.csv", "text/html", [".csv"], False),
        ("tabla.exe", "application/octet-stream", [".csv"], False),
        ("capa.prj", "text/plain", [".prj"], True),
        ("sin_extension", "application/pdf", ["application/pdf"], False),
    ],
)
def test_formato_permitido_exige_extension_y_contenido(nombre, detectado, accept, permitido):
    assert tipo_archivo.formato_permitido(nombre, detectado, accept) is permitido


@pytest.mark.parametrize(
    ("mime", "inline"),
    [
        ("image/png", True),
        ("application/pdf", True),
        ("image/svg+xml", False),
        ("text/html", False),
        ("text/plain", False),
        (None, False),
    ],
)
def test_solo_raster_y_pdf_se_sirven_inline(mime, inline):
    assert tipo_archivo.es_inline_seguro(mime) is inline
