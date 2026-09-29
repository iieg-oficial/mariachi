from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from minio.commonconfig import REPLACE

from app.services import acervo_barrido
from app.services.acervo import AcervoClient
from tests.test_acervo import _png_bytes, _seed_bucket

HTML = b"<!doctype html><html><body><script>alert(document.cookie)</script></body></html>"
PDF = b"%PDF-1.7\n%\xe2\xe3\xcf\xd3\n1 0 obj\n"


class FakeS3:
    instances: dict[str, "FakeS3"] = {}

    def __init__(self, bucket_name: str) -> None:
        self.bucket_name = bucket_name
        self.objects: dict[str, dict] = {}
        self.escrituras: list[tuple[str, dict[str, str]]] = []
        self.lecturas: list[tuple[str, int]] = []

    @classmethod
    def for_bucket(cls, bucket) -> "FakeS3":
        return cls.instances.setdefault(bucket.acervo_bucket, cls(bucket.acervo_bucket))

    def poner(
        self, nombre: str, data: bytes, content_type: str, metadata: dict | None = None
    ) -> None:
        self.objects[nombre] = {
            "data": data,
            "content_type": content_type,
            "metadata": metadata or {},
        }

    def list_objects(
        self, prefix: str = "", recursive: bool = True, limit: int | None = None
    ) -> list[dict]:
        return [
            {"name": nombre, "size": len(obj["data"]), "is_dir": False}
            for nombre, obj in self.objects.items()
        ]

    def stat_object(self, object_name: str) -> SimpleNamespace:
        obj = self.objects[object_name]
        return SimpleNamespace(content_type=obj["content_type"], metadata=dict(obj["metadata"]))

    def leer_cabecera(self, object_name: str, length: int = 4096) -> bytes:
        self.lecturas.append((object_name, length))
        return self.objects[object_name]["data"][:length]

    def reescribir_metadatos(self, object_name: str, metadata: dict[str, str]) -> None:
        self.escrituras.append((object_name, metadata))
        obj = self.objects[object_name]
        obj["content_type"] = metadata["Content-Type"]
        obj["metadata"] = {k: v for k, v in metadata.items() if k != "Content-Type"}


@pytest.fixture(autouse=True)
def fake_s3():
    FakeS3.instances.clear()
    with patch.object(acervo_barrido, "AcervoClient", FakeS3):
        yield FakeS3.instances


def _bucket(db_session, nombre: str) -> FakeS3:
    _, bucket = _seed_bucket(db_session, name=nombre)
    return FakeS3.for_bucket(bucket)


def test_detecta_html_disfrazado_de_pdf(db_session):
    s3 = _bucket(db_session, "sieej")
    s3.poner("envios/reporte.pdf", HTML, "application/pdf")

    hallazgos, resumen = acervo_barrido.barrer(db_session)

    assert resumen.revisados == 1
    assert len(hallazgos) == 1
    hallazgo = hallazgos[0]
    assert hallazgo.real == "text/html"
    assert {"real_distinto", "extension_distinta", "real_activo_inline"} <= set(hallazgo.motivos)
    assert hallazgo.nuevo_tipo == "text/html"
    assert hallazgo.nueva_disposicion.startswith('attachment; filename="reporte.pdf"')
    assert s3.lecturas == [("envios/reporte.pdf", 4096)]


def test_detecta_content_type_activo_guardado(db_session):
    s3 = _bucket(db_session, "mariachi")
    s3.poner("notas/nota.txt", b"hola mundo", "text/html")

    hallazgos, _ = acervo_barrido.barrer(db_session)

    assert [h.objeto for h in hallazgos] == ["notas/nota.txt"]
    assert "guardado_activo" in hallazgos[0].motivos
    assert hallazgos[0].nuevo_tipo == "text/plain"


def test_respeta_imagenes_y_pdf_validos(db_session):
    s3 = _bucket(db_session, "mariachi")
    s3.poner("mapas/mapa.png", _png_bytes(), "image/png")
    s3.poner(
        "docs/informe.pdf",
        PDF,
        "application/pdf",
        {"content-disposition": 'inline; filename="informe.pdf"'},
    )

    hallazgos, resumen = acervo_barrido.barrer(db_session, corregir=True)

    assert resumen.revisados == 2
    assert hallazgos == []
    assert s3.escrituras == []


def test_excluye_el_bucket_portal(db_session):
    portal = _bucket(db_session, "portal")
    portal.poner("x.pdf", HTML, "application/pdf")
    otro = _bucket(db_session, "sieej")
    otro.poner("y.pdf", PDF, "application/pdf")

    hallazgos, resumen = acervo_barrido.barrer(
        db_session, corregir=True, nombres=["portal", "sieej"]
    )

    assert resumen.buckets == ["sieej"]
    assert hallazgos == []
    assert portal.lecturas == []
    assert portal.escrituras == []


def test_el_reporte_no_escribe(db_session):
    s3 = _bucket(db_session, "sieej")
    s3.poner("reporte.pdf", HTML, "application/pdf")

    hallazgos, resumen = acervo_barrido.barrer(db_session)

    assert hallazgos[0].accion == "reporte"
    assert resumen.corregidos == 0
    assert s3.escrituras == []
    assert s3.objects["reporte.pdf"]["content_type"] == "application/pdf"


def test_corregir_reescribe_metadatos_sin_tocar_contenido(db_session):
    s3 = _bucket(db_session, "sieej")
    s3.poner("reporte.pdf", HTML, "application/pdf", {"x-amz-meta-origen": "sieej"})

    hallazgos, resumen = acervo_barrido.barrer(db_session, corregir=True)

    assert hallazgos[0].accion == "corregido"
    assert resumen.corregidos == 1
    obj = s3.objects["reporte.pdf"]
    assert obj["data"] == HTML
    assert obj["content_type"] == "text/html"
    assert obj["metadata"]["Content-Disposition"].startswith("attachment;")
    assert obj["metadata"]["x-amz-meta-origen"] == "sieej"

    segunda, resumen2 = acervo_barrido.barrer(db_session, corregir=True)
    assert [h.accion for h in segunda] == ["sin_cambios"]
    assert resumen2.corregidos == 0


def test_cliente_real_lee_por_rango_y_reemplaza_metadatos():
    cliente = AcervoClient.__new__(AcervoClient)
    cliente.bucket_name = "sieej"
    cliente.client = MagicMock()
    cliente.client.get_object.return_value.read.return_value = b"%PDF-"

    assert cliente.leer_cabecera("a.pdf") == b"%PDF-"
    cliente.client.get_object.assert_called_once_with("sieej", "a.pdf", offset=0, length=4096)

    cliente.reescribir_metadatos("a.pdf", {"Content-Type": "text/html"})
    args, kwargs = cliente.client.copy_object.call_args
    assert args[:2] == ("sieej", "a.pdf")
    assert args[2].bucket_name == "sieej" and args[2].object_name == "a.pdf"
    assert kwargs["metadata_directive"] == REPLACE
    assert kwargs["metadata"] == {"Content-Type": "text/html"}


def _stat(content_type: str, metadata: dict | None = None) -> SimpleNamespace:
    return SimpleNamespace(content_type=content_type, metadata=metadata or {})


def test_csv_gzip_servido_con_content_encoding_no_se_marca() -> None:
    texto = b"clave_municipio,valor\n14001,10\n"
    stat = _stat("text/csv", {"Content-Encoding": "gzip"})
    hallazgo = acervo_barrido.evaluar(
        "mapalab", "downloads/demografia/poblacion.csv.gz", len(texto), stat, texto
    )
    assert hallazgo is None


def test_svg_sin_codigo_no_se_marca() -> None:
    svg = (
        b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h10v10z"/></svg>'
    )
    hallazgo = acervo_barrido.evaluar(
        "iieg", "iconos/flecha.svg", len(svg), _stat("image/svg+xml"), svg
    )
    assert hallazgo is None


def test_svg_con_script_se_marca() -> None:
    svg = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
    hallazgo = acervo_barrido.evaluar(
        "iieg", "iconos/malo.svg", len(svg), _stat("image/svg+xml"), svg
    )
    assert hallazgo is not None
    assert "guardado_activo" in hallazgo.motivos


def test_svg_mayor_que_la_cabecera_se_marca() -> None:
    svg = b'<svg xmlns="http://www.w3.org/2000/svg">' + b" " * 5000 + b"</svg>"
    cabecera = svg[:4096]
    hallazgo = acervo_barrido.evaluar(
        "iieg", "iconos/grande.svg", len(svg), _stat("image/svg+xml"), cabecera
    )
    assert hallazgo is not None
