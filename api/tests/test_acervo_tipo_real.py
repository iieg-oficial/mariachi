import io
from types import SimpleNamespace

from app.models.acervo import AcervoFile
from app.services import acervo_chunked
from tests.conftest import ADMIN_PREFIX
from tests.test_acervo import (
    FakeAcervoClient,
    _png_bytes,
    _seed_bucket,
    _subir,
    patch_acervo,
)

HTML = b"<!doctype html><html><body><script>alert(document.cookie)</script></body></html>"

__all__ = ["patch_acervo"]


def test_la_subida_guarda_el_tipo_real_y_no_el_del_cliente(admin_session, db_session):
    _, bucket = _seed_bucket(db_session, name="x")
    subida = _subir(
        admin_session["client"], admin_session["csrf"], bucket.id, "nota.txt", HTML, "text/plain"
    )
    assert subida.status_code == 201, subida.text

    guardado = FakeAcervoClient.for_bucket(bucket).objects[subida.json()["name"]]
    assert guardado["content_type"] == "text/html"
    assert guardado["metadata"]["Content-Disposition"].startswith("attachment;")
    assert db_session.query(AcervoFile).one().type == "text/html"


def test_el_proxy_no_deja_ejecutar_html(admin_session, db_session):
    _, bucket = _seed_bucket(db_session, name="x")
    client = admin_session["client"]
    subida = _subir(client, admin_session["csrf"], bucket.id, "reporte.pdf", HTML, "application/pdf")
    assert subida.status_code == 201, subida.text

    resp = client.get(f"{ADMIN_PREFIX}/acervo/proxy/{bucket.id}/{subida.json()['name']}")
    assert resp.status_code == 200
    assert resp.headers["x-content-type-options"] == "nosniff"
    assert resp.headers["content-security-policy"] == "default-src 'none'; sandbox"
    assert resp.headers["content-disposition"].startswith("attachment;")


def test_el_proxy_sirve_inline_las_imagenes_raster(admin_session, db_session):
    _, bucket = _seed_bucket(db_session, name="x")
    client = admin_session["client"]
    subida = _subir(client, admin_session["csrf"], bucket.id, "mapa.png", _png_bytes(), "text/html")
    assert subida.status_code == 201, subida.text

    resp = client.get(f"{ADMIN_PREFIX}/acervo/proxy/{bucket.id}/{subida.json()['name']}")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "image/png"
    assert resp.headers["x-content-type-options"] == "nosniff"
    assert "content-security-policy" not in resp.headers
    assert "content-disposition" not in resp.headers


def _sesion_chunked(monkeypatch, bucket, user_id: int, content_type: str) -> SimpleNamespace:
    abortos: list[str] = []
    cliente = SimpleNamespace(
        abort_multipart_upload=lambda key, upload_id: abortos.append(key),
        upload_part=lambda *args: "etag",
    )
    monkeypatch.setattr(
        FakeAcervoClient,
        "_cache",
        {f"{bucket.acervo_bucket}:{bucket.access_key_ref}": cliente},
        raising=False,
    )
    sesion = {
        "object_key": "grande.csv",
        "upload_id": "u1",
        "bucket_id": bucket.id,
        "bucket_name": bucket.acervo_bucket,
        "access_key_ref": bucket.access_key_ref,
        "original_name": "grande.csv",
        "content_type": content_type,
        "user_id": user_id,
        "parts": [],
    }
    borradas: list[str] = []
    monkeypatch.setattr(acervo_chunked, "get_session", lambda session_id: dict(sesion))
    monkeypatch.setattr(acervo_chunked, "update_session", lambda session_id, data: None)
    monkeypatch.setattr(acervo_chunked, "delete_session", lambda session_id: borradas.append(session_id))
    return SimpleNamespace(abortos=abortos, borradas=borradas)


def _parte(client, csrf, data: bytes):
    return client.post(
        f"{ADMIN_PREFIX}/acervo/chunked/s1/part",
        data={"part_number": "1"},
        files={"chunk": ("blob", io.BytesIO(data), "application/octet-stream")},
        headers={"X-CSRF-Token": csrf},
    )


def test_una_sesion_chunked_ajena_no_se_puede_usar(admin_session, db_session, monkeypatch):
    _, bucket = _seed_bucket(db_session, name="x")
    _sesion_chunked(monkeypatch, bucket, user_id=admin_session["user"].id + 1, content_type="text/csv")
    resp = _parte(admin_session["client"], admin_session["csrf"], b"a,b\n1,2\n")
    assert resp.status_code == 404


def test_chunked_rechaza_html_con_extension_inocente(admin_session, db_session, monkeypatch):
    _, bucket = _seed_bucket(db_session, name="x")
    registro = _sesion_chunked(
        monkeypatch, bucket, user_id=admin_session["user"].id, content_type="text/csv"
    )
    resp = _parte(admin_session["client"], admin_session["csrf"], HTML)
    assert resp.status_code == 415
    assert registro.abortos == ["grande.csv"]
    assert registro.borradas == ["s1"]
