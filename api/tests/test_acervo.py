import io
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from minio.error import S3Error

from app.models.acervo import AcervoFile, AcervoFolder
from app.models.acervo_bucket import AcervoBucket
from app.models.project import Project, UserProject
from tests.conftest import ADMIN_PREFIX


class _FakeStream:
    def __init__(self, data: bytes):
        self._data = data

    def read(self):
        return self._data

    def stream(self, _size):
        yield self._data

    def close(self):
        pass

    def release_conn(self):
        pass


def _s3_missing(object_name: str) -> S3Error:
    return S3Error("NoSuchKey", "not found", object_name, "", "", None)


class FakeAcervoClient:
    instances: dict[str, "FakeAcervoClient"] = {}

    def __init__(self, bucket_name: str, *_, **__):
        self.bucket_name = bucket_name
        self.objects: dict[str, dict] = {}

    @classmethod
    def reset(cls):
        cls.instances.clear()

    @classmethod
    def for_bucket(cls, bucket):
        name = bucket.acervo_bucket
        if name not in cls.instances:
            cls.instances[name] = cls(name)
        return cls.instances[name]

    @classmethod
    def invalidate_cache(cls, bucket_name=None):
        return None

    async def upload_file(self, file, object_name):
        data = await file.read()
        self.objects[object_name] = {
            "name": object_name,
            "size": len(data),
            "last_modified": None,
            "etag": "fake",
            "is_dir": False,
            "url": f"http://fake/{object_name}",
            "data": data,
            "content_type": getattr(file, "content_type", None),
        }
        return f"http://fake/{object_name}"

    def stat_object(self, object_name):
        obj = self.objects.get(object_name)
        if obj is None:
            raise _s3_missing(object_name)
        return SimpleNamespace(
            size=obj.get("size", 0),
            etag=obj.get("etag", "fake"),
            content_type=obj.get("content_type"),
        )

    def get_object_stream(self, object_name):
        obj = self.objects.get(object_name)
        if obj is None:
            raise _s3_missing(object_name)
        return _FakeStream(obj.get("data", b""))

    def put_bytes(self, object_name, data, content_type):
        self.objects[object_name] = {
            "name": object_name,
            "size": len(data),
            "last_modified": None,
            "etag": "fake",
            "is_dir": False,
            "url": f"http://fake/{object_name}",
            "data": data,
            "content_type": content_type,
        }

    def list_objects(self, prefix="", recursive=True):
        prefix = prefix or ""
        if recursive:
            return [v for k, v in self.objects.items() if k.startswith(prefix)]
        results = []
        seen_dirs = set()
        for k, v in self.objects.items():
            if not k.startswith(prefix):
                continue
            rest = k[len(prefix):]
            slash = rest.find("/")
            if slash == -1:
                results.append(v)
            else:
                dirkey = prefix + rest[: slash + 1]
                if dirkey not in seen_dirs:
                    seen_dirs.add(dirkey)
                    results.append({
                        "name": dirkey,
                        "size": 0,
                        "last_modified": None,
                        "etag": "",
                        "is_dir": True,
                        "url": f"http://fake/{dirkey}",
                    })
        return results

    def get_file_url(self, object_name):
        return f"http://fake/{object_name}"

    def delete_file(self, object_name):
        self.objects.pop(object_name, None)
        return True

    def delete_prefix(self, prefix):
        keys = [k for k in self.objects if k.startswith(prefix)]
        for k in keys:
            del self.objects[k]
        return len(keys)

    def copy_file(self, source_name, dest_name):
        src = self.objects[source_name]
        self.objects[dest_name] = {**src, "name": dest_name, "url": f"http://fake/{dest_name}"}

    def put_empty_object(self, object_name):
        self.objects[object_name] = {
            "name": object_name,
            "size": 0,
            "last_modified": None,
            "etag": "fake",
            "is_dir": object_name.endswith("/"),
            "url": f"http://fake/{object_name}",
        }


@pytest.fixture(autouse=True)
def patch_acervo():
    FakeAcervoClient.reset()
    with patch("app.api.routes.acervo.AcervoClient", FakeAcervoClient), \
         patch("app.services.acervo_file_service.AcervoClient", FakeAcervoClient):
        yield


def _seed_bucket(db_session, *, name="mariachi", is_public=False):
    project = Project(slug=f"proj-{name}", name=name.title(), is_active=True)
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)

    bucket = AcervoBucket(
        project_id=project.id,
        acervo_bucket=name,
        access_key_ref=f"ACERVO_{name.upper()}",
        display_name=name.title(),
        is_public=is_public,
    )
    db_session.add(bucket)
    db_session.commit()
    db_session.refresh(bucket)
    return project, bucket


def test_listar_carpetas_requires_bucket_id(admin_session):
    client = admin_session["client"]
    response = client.get(f"{ADMIN_PREFIX}/acervo/carpetas")
    assert response.status_code == 422


def test_listar_carpetas_filters_by_bucket(admin_session, db_session):
    _, bucket_a = _seed_bucket(db_session, name="bucket-a")
    _, bucket_b = _seed_bucket(db_session, name="bucket-b")
    db_session.add_all([
        AcervoFolder(bucket_id=bucket_a.id, name="docs", path="/docs/", parent=None),
        AcervoFolder(bucket_id=bucket_b.id, name="img", path="/img/", parent=None),
    ])
    db_session.commit()

    client = admin_session["client"]
    response = client.get(f"{ADMIN_PREFIX}/acervo/carpetas?bucket_id={bucket_a.id}")
    assert response.status_code == 200
    body = response.json()
    assert [f["path"] for f in body] == ["/docs/"]
    assert body[0]["bucket_id"] == bucket_a.id


def test_crear_carpeta_scoped_to_bucket(admin_session, db_session):
    _, bucket = _seed_bucket(db_session, name="x")
    client = admin_session["client"]
    response = client.post(
        f"{ADMIN_PREFIX}/acervo/carpetas",
        json={"bucket_id": bucket.id, "name": "videos", "parent": None},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 201
    assert response.json()["path"] == "videos/"
    assert response.json()["bucket_id"] == bucket.id


def test_crear_carpeta_duplicada_409(admin_session, db_session):
    _, bucket = _seed_bucket(db_session, name="x")
    db_session.add(
        AcervoFolder(bucket_id=bucket.id, name="videos", path="videos/", parent=None)
    )
    db_session.commit()

    client = admin_session["client"]
    response = client.post(
        f"{ADMIN_PREFIX}/acervo/carpetas",
        json={"bucket_id": bucket.id, "name": "videos", "parent": None},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 409


def test_eliminar_carpeta_vacia_ok(admin_session, db_session):
    _, bucket = _seed_bucket(db_session, name="x")
    folder = AcervoFolder(bucket_id=bucket.id, name="docs", path="/docs/", parent=None)
    db_session.add(folder)
    db_session.commit()
    db_session.refresh(folder)

    client = admin_session["client"]
    response = client.delete(
        f"{ADMIN_PREFIX}/acervo/carpetas/{folder.id}",
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 200
    assert db_session.query(AcervoFolder).filter(AcervoFolder.id == folder.id).first() is None


def test_eliminar_carpeta_con_archivos_409(admin_session, db_session, admin_user):
    _, bucket = _seed_bucket(db_session, name="x")
    folder = AcervoFolder(bucket_id=bucket.id, name="docs", path="/docs/", parent=None)
    media = AcervoFile(
        bucket_id=bucket.id,
        name="docs/file.pdf",
        original_name="file.pdf",
        type="application/pdf",
        size=10,
        url="http://fake/docs/file.pdf",
        folder="/docs/",
        uploaded_by=admin_user.id,
    )
    db_session.add_all([folder, media])
    db_session.commit()
    db_session.refresh(folder)

    client = admin_session["client"]
    response = client.delete(
        f"{ADMIN_PREFIX}/acervo/carpetas/{folder.id}",
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 409


def test_subir_archivo_a_raiz_no_rompe(admin_session, db_session):
    _, bucket = _seed_bucket(db_session, name="x")
    client = admin_session["client"]
    response = client.post(
        f"{ADMIN_PREFIX}/acervo",
        data={"folder": "/", "alt": "", "bucket_id": str(bucket.id)},
        files={"file": ("hola.txt", io.BytesIO(b"hola"), "text/plain")},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["folder"] == "/"
    assert body["bucket_id"] == bucket.id


def test_subir_archivo_a_subcarpeta_crea_folder(admin_session, db_session):
    _, bucket = _seed_bucket(db_session, name="x")
    client = admin_session["client"]
    response = client.post(
        f"{ADMIN_PREFIX}/acervo",
        data={"folder": "imagenes", "alt": "logo", "bucket_id": str(bucket.id)},
        files={"file": ("logo.png", io.BytesIO(b"\x89PNG..."), "image/png")},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 201
    folder_row = (
        db_session.query(AcervoFolder)
        .filter(AcervoFolder.bucket_id == bucket.id, AcervoFolder.path == "imagenes/")
        .first()
    )
    assert folder_row is not None


def test_actualizar_archivo_metadata(admin_session, db_session, admin_user):
    _, bucket = _seed_bucket(db_session, name="x")
    media = AcervoFile(
        bucket_id=bucket.id,
        name="a.txt",
        original_name="a.txt",
        type="text/plain",
        size=1,
        url="http://fake/a.txt",
        folder="/",
        uploaded_by=admin_user.id,
        metadata_json={},
    )
    db_session.add(media)
    db_session.commit()
    db_session.refresh(media)

    client = admin_session["client"]
    response = client.put(
        f"{ADMIN_PREFIX}/acervo/{media.id}",
        json={"alt": "descr", "description": "una descripcion", "folder": "/docs/"},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["metadata"]["alt"] == "descr"
    assert body["metadata"]["description"] == "una descripcion"
    assert body["folder"] == "/docs/"


def test_eliminar_archivo_con_id_int(admin_session, db_session, admin_user):
    _, bucket = _seed_bucket(db_session, name="x")
    fake = FakeAcervoClient.for_bucket(bucket)
    fake.objects["a.txt"] = {"name": "a.txt", "size": 1, "is_dir": False}

    media = AcervoFile(
        bucket_id=bucket.id,
        name="a.txt",
        original_name="a.txt",
        type="text/plain",
        size=1,
        url="http://fake/a.txt",
        folder="/",
        uploaded_by=admin_user.id,
    )
    db_session.add(media)
    db_session.commit()
    db_session.refresh(media)

    client = admin_session["client"]
    response = client.delete(
        f"{ADMIN_PREFIX}/acervo/{media.id}",
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 200
    assert db_session.query(AcervoFile).filter(AcervoFile.id == media.id).first() is None


def test_eliminar_directorio_admin(admin_session, db_session):
    _, bucket = _seed_bucket(db_session, name="x")
    client = admin_session["client"]
    client.post(
        f"{ADMIN_PREFIX}/acervo",
        data={"folder": "tmp", "alt": "", "bucket_id": str(bucket.id)},
        files={"file": ("a.txt", io.BytesIO(b"hi"), "text/plain")},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )

    response = client.delete(
        f"{ADMIN_PREFIX}/acervo/dir:{bucket.id}:tmp/",
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 200
    assert "Directorio eliminado" in response.json()["message"]


def test_eliminar_directorio_editora_403(editora_session, db_session, editora_user):
    project, bucket = _seed_bucket(db_session, name="x")
    db_session.add(
        UserProject(user_id=editora_user.id, project_id=project.id, project_role="editor")
    )
    db_session.commit()

    client = editora_session["client"]
    response = client.delete(
        f"{ADMIN_PREFIX}/acervo/dir:{bucket.id}:tmp/",
        headers={"X-CSRF-Token": editora_session["csrf"]},
    )
    assert response.status_code == 403


def test_listar_media_oculta_reportes_en_mariachi(admin_session, db_session, admin_user):
    _, bucket = _seed_bucket(db_session, name="mariachi")
    fake = FakeAcervoClient.for_bucket(bucket)
    fake.objects["reportes/2026/05/x.png"] = {
        "name": "reportes/2026/05/x.png", "size": 1, "is_dir": False,
    }
    fake.objects["docs/manual.pdf"] = {
        "name": "docs/manual.pdf", "size": 1, "is_dir": False,
    }

    client = admin_session["client"]
    response = client.get(f"{ADMIN_PREFIX}/acervo?bucket_id={bucket.id}&recursive=true")
    assert response.status_code == 200
    names = [item["name"] for item in response.json()]
    assert "docs/manual.pdf" in names
    assert all(not n.startswith("reportes/") for n in names)


def test_crear_carpeta_vacia_visible_y_oculta_marker(admin_session, db_session):
    _, bucket = _seed_bucket(db_session, name="x")
    client = admin_session["client"]

    response = client.post(
        f"{ADMIN_PREFIX}/acervo/carpetas",
        json={"bucket_id": bucket.id, "name": "iconos", "parent": None},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 201

    listado = client.get(f"{ADMIN_PREFIX}/acervo?bucket_id={bucket.id}")
    assert listado.status_code == 200
    names = [item["name"] for item in listado.json()]
    assert "iconos/" in names
    assert all(not n.endswith("/.keep") for n in names)


def test_mover_archivo_registrado(admin_session, db_session, admin_user):
    _, bucket = _seed_bucket(db_session, name="x")
    fake = FakeAcervoClient.for_bucket(bucket)
    fake.objects["logo.png"] = {"name": "logo.png", "size": 5, "is_dir": False, "last_modified": None, "etag": "e", "url": "http://fake/logo.png"}
    media = AcervoFile(
        bucket_id=bucket.id,
        name="logo.png",
        original_name="logo.png",
        type="image/png",
        size=5,
        url="http://fake/logo.png",
        folder="/",
        uploaded_by=admin_user.id,
    )
    db_session.add(media)
    db_session.commit()
    db_session.refresh(media)

    client = admin_session["client"]
    response = client.post(
        f"{ADMIN_PREFIX}/acervo/mover",
        json={"id": str(media.id), "folder": "iconos/"},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 200, response.text
    assert response.json()["name"] == "iconos/logo.png"
    assert "iconos/logo.png" in fake.objects
    assert "logo.png" not in fake.objects
    db_session.refresh(media)
    assert media.folder == "iconos/"


def test_mover_archivo_bucket_only(admin_session, db_session):
    _, bucket = _seed_bucket(db_session, name="x")
    fake = FakeAcervoClient.for_bucket(bucket)
    fake.objects["a.svg"] = {"name": "a.svg", "size": 2, "is_dir": False, "last_modified": None, "etag": "e", "url": "http://fake/a.svg"}

    client = admin_session["client"]
    response = client.post(
        f"{ADMIN_PREFIX}/acervo/mover",
        json={"id": f"bucket:{bucket.id}:a.svg", "folder": "iconos"},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 200, response.text
    assert response.json()["name"] == "iconos/a.svg"
    assert "iconos/a.svg" in fake.objects
    assert "a.svg" not in fake.objects


def test_info_carpeta(admin_session, db_session):
    _, bucket = _seed_bucket(db_session, name="x")
    fake = FakeAcervoClient.for_bucket(bucket)
    fake.objects["iconos/.keep"] = {"name": "iconos/.keep", "size": 0, "is_dir": False, "last_modified": None, "etag": "e"}
    fake.objects["iconos/a.png"] = {"name": "iconos/a.png", "size": 10, "is_dir": False, "last_modified": "2026-06-10T12:00:00", "etag": "e"}
    fake.objects["iconos/docs/b.pdf"] = {"name": "iconos/docs/b.pdf", "size": 20, "is_dir": False, "last_modified": "2026-06-09T12:00:00", "etag": "e"}

    client = admin_session["client"]
    response = client.get(f"{ADMIN_PREFIX}/acervo/carpetas/{bucket.id}/info?prefix=iconos")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["fileCount"] == 2
    assert body["totalSize"] == 30
    assert body["imageCount"] == 1
    assert body["subfolderCount"] == 1
    assert body["lastModified"] == "2026-06-10T12:00:00"


def test_eliminar_directorio_limpia_acervo_folders(admin_session, db_session):
    _, bucket = _seed_bucket(db_session, name="x")
    fake = FakeAcervoClient.for_bucket(bucket)
    fake.objects["tmp/.keep"] = {"name": "tmp/.keep", "size": 0, "is_dir": False, "last_modified": None, "etag": "e"}
    db_session.add(AcervoFolder(bucket_id=bucket.id, name="tmp", path="tmp/", parent=None))
    db_session.commit()

    client = admin_session["client"]
    response = client.delete(
        f"{ADMIN_PREFIX}/acervo/dir:{bucket.id}:tmp/",
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 200
    remaining = db_session.query(AcervoFolder).filter(AcervoFolder.bucket_id == bucket.id).count()
    assert remaining == 0


def test_acervo_registra_actividad(admin_session, db_session):
    from app.models.actividad_log import ActividadLog

    _, bucket = _seed_bucket(db_session, name="x")
    client = admin_session["client"]

    client.post(
        f"{ADMIN_PREFIX}/acervo",
        data={"folder": "iconos", "alt": "", "bucket_id": str(bucket.id)},
        files={"file": ("logo.svg", io.BytesIO(b"<svg/>"), "image/svg+xml")},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    media = db_session.query(AcervoFile).filter(AcervoFile.bucket_id == bucket.id).first()

    client.post(
        f"{ADMIN_PREFIX}/acervo/mover",
        json={"id": str(media.id), "folder": "otra"},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    client.delete(
        f"{ADMIN_PREFIX}/acervo/{media.id}",
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )

    actions = [a.action for a in db_session.query(ActividadLog).order_by(ActividadLog.id).all()]
    assert "acervo.file.upload" in actions
    assert "acervo.file.move" in actions
    assert "acervo.file.delete" in actions

    upload = db_session.query(ActividadLog).filter(ActividadLog.action == "acervo.file.upload").first()
    assert upload.log_metadata["nombre"] == "logo.svg"
    assert upload.log_metadata["bucket"] == "x"


def test_subir_archivo_duplicado_409(admin_session, db_session):
    _, bucket = _seed_bucket(db_session, name="x")
    client = admin_session["client"]
    primera = client.post(
        f"{ADMIN_PREFIX}/acervo",
        data={"folder": "iconos", "alt": "", "bucket_id": str(bucket.id)},
        files={"file": ("logo.svg", io.BytesIO(b"<svg/>"), "image/svg+xml")},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert primera.status_code == 201

    repetida = client.post(
        f"{ADMIN_PREFIX}/acervo",
        data={"folder": "iconos", "alt": "", "bucket_id": str(bucket.id)},
        files={"file": ("logo.svg", io.BytesIO(b"<svg/>"), "image/svg+xml")},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert repetida.status_code == 409
    assert "Ya existe" in repetida.json()["detail"]

    otra_carpeta = client.post(
        f"{ADMIN_PREFIX}/acervo",
        data={"folder": "otra", "alt": "", "bucket_id": str(bucket.id)},
        files={"file": ("logo.svg", io.BytesIO(b"<svg/>"), "image/svg+xml")},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert otra_carpeta.status_code == 201


def test_proxy_object_unauth_401(client, db_session):
    _, bucket = _seed_bucket(db_session, name="x")
    response = client.get(f"{ADMIN_PREFIX}/acervo/proxy/{bucket.id}/a.txt")
    assert response.status_code == 401


@pytest.mark.parametrize(
    "entrada,esperado",
    [
        ("Mi Archivo.SVG", "mi-archivo.svg"),
        ("foto (1).PNG", "foto-1.png"),
        ("Niño Año.jpeg", "nino-ano.jpeg"),
        ("../../etc/passwd", "passwd"),
        ("___.pdf", "archivo.pdf"),
        ("sin-extension", "sin-extension"),
    ],
)
def test_sanitize_filename(entrada, esperado):
    from app.services.acervo_file_service import sanitize_filename

    assert sanitize_filename(entrada) == esperado


def test_subir_usa_nombre_original_como_key(admin_session, db_session):
    _, bucket = _seed_bucket(db_session, name="x")
    client = admin_session["client"]
    response = client.post(
        f"{ADMIN_PREFIX}/acervo",
        data={"folder": "iconos", "alt": "", "bucket_id": str(bucket.id)},
        files={"file": ("Mi Logo.SVG", io.BytesIO(b"<svg/>"), "image/svg+xml")},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["name"] == "iconos/mi-logo.svg"
    assert body["originalName"] == "mi-logo.svg"


def test_subir_con_uuid_genera_key_aleatorio(admin_session, db_session):
    _, bucket = _seed_bucket(db_session, name="x")
    client = admin_session["client"]
    response = client.post(
        f"{ADMIN_PREFIX}/acervo",
        data={"folder": "iconos", "alt": "", "bucket_id": str(bucket.id), "use_uuid": "true"},
        files={"file": ("logo.svg", io.BytesIO(b"<svg/>"), "image/svg+xml")},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["originalName"] == "logo.svg"
    assert body["name"] != "iconos/logo.svg"
    assert body["name"].startswith("iconos/")
    assert body["name"].endswith(".svg")


def test_subir_on_conflict_rename_agrega_consecutivo(admin_session, db_session):
    _, bucket = _seed_bucket(db_session, name="x")
    client = admin_session["client"]
    primera = client.post(
        f"{ADMIN_PREFIX}/acervo",
        data={"folder": "iconos", "alt": "", "bucket_id": str(bucket.id)},
        files={"file": ("logo.svg", io.BytesIO(b"<svg/>"), "image/svg+xml")},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert primera.status_code == 201
    assert primera.json()["name"] == "iconos/logo.svg"

    segunda = client.post(
        f"{ADMIN_PREFIX}/acervo",
        data={"folder": "iconos", "alt": "", "bucket_id": str(bucket.id), "on_conflict": "rename"},
        files={"file": ("logo.svg", io.BytesIO(b"<svg/>"), "image/svg+xml")},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert segunda.status_code == 201, segunda.text
    body = segunda.json()
    assert body["name"] == "iconos/logo-2.svg"
    assert body["originalName"] == "logo-2.svg"


def _png_bytes(w=800, h=600, color=(200, 30, 30)):
    from PIL import Image

    buf = io.BytesIO()
    Image.new("RGB", (w, h), color).save(buf, format="PNG")
    return buf.getvalue()


def _subir(client, csrf, bucket_id, filename, data, content_type, folder="mapas"):
    return client.post(
        f"{ADMIN_PREFIX}/acervo",
        data={"folder": folder, "alt": "", "bucket_id": str(bucket_id)},
        files={"file": (filename, io.BytesIO(data), content_type)},
        headers={"X-CSRF-Token": csrf},
    )


def test_thumbnail_raster_genera_webp(admin_session, db_session):
    _, bucket = _seed_bucket(db_session, name="x")
    client = admin_session["client"]
    subida = _subir(client, admin_session["csrf"], bucket.id, "mapa.png", _png_bytes(), "image/png")
    assert subida.status_code == 201, subida.text
    name = subida.json()["name"]  # mapas/mapa.png

    resp = client.get(f"{ADMIN_PREFIX}/acervo/thumb/{bucket.id}/{name}?w=400")
    assert resp.status_code == 200, resp.text
    assert resp.headers["content-type"] == "image/webp"
    assert resp.content[:4] == b"RIFF" and resp.content[8:12] == b"WEBP"

    fake = FakeAcervoClient.for_bucket(bucket)
    assert any(k.startswith(".thumbs/") for k in fake.objects), "no se cacheó la miniatura"


def test_thumbnail_svg_passthrough(admin_session, db_session):
    _, bucket = _seed_bucket(db_session, name="x")
    client = admin_session["client"]
    svg = b"<svg xmlns='http://www.w3.org/2000/svg'><rect width='10' height='10'/></svg>"
    subida = _subir(client, admin_session["csrf"], bucket.id, "icono.svg", svg, "image/svg+xml")
    assert subida.status_code == 201
    name = subida.json()["name"]

    resp = client.get(f"{ADMIN_PREFIX}/acervo/thumb/{bucket.id}/{name}?w=400")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "image/svg+xml"
    assert resp.content == svg
    fake = FakeAcervoClient.for_bucket(bucket)
    assert not any(k.startswith(".thumbs/") for k in fake.objects), "el SVG no debe rasterizarse"


def test_thumbnail_requires_auth(client, db_session):
    _, bucket = _seed_bucket(db_session, name="x")
    resp = client.get(f"{ADMIN_PREFIX}/acervo/thumb/{bucket.id}/mapas/x.png")
    assert resp.status_code == 401


def test_serialize_thumbnail_por_tipo(admin_session, db_session):
    _, bucket = _seed_bucket(db_session, name="x")
    client = admin_session["client"]
    _subir(client, admin_session["csrf"], bucket.id, "mapa.png", _png_bytes(), "image/png")
    _subir(client, admin_session["csrf"], bucket.id, "icono.svg",
           b"<svg xmlns='http://www.w3.org/2000/svg'/>", "image/svg+xml")

    listado = client.get(f"{ADMIN_PREFIX}/acervo?bucket_id={bucket.id}&folder=mapas&recursive=true")
    assert listado.status_code == 200
    by_name = {item["originalName"]: item for item in listado.json()}
    assert f"/acervo/thumb/{bucket.id}/" in by_name["mapa.png"]["thumbnail"]
    assert by_name["icono.svg"]["thumbnail"] == by_name["icono.svg"]["url"]


def test_thumbnail_cleanup_on_delete(admin_session, db_session):
    _, bucket = _seed_bucket(db_session, name="x")
    client = admin_session["client"]
    subida = _subir(client, admin_session["csrf"], bucket.id, "mapa.png", _png_bytes(), "image/png")
    media_id = subida.json()["id"]
    name = subida.json()["name"]

    client.get(f"{ADMIN_PREFIX}/acervo/thumb/{bucket.id}/{name}?w=400")
    fake = FakeAcervoClient.for_bucket(bucket)
    assert any(k.startswith(".thumbs/") for k in fake.objects)

    resp = client.delete(
        f"{ADMIN_PREFIX}/acervo/{media_id}",
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert resp.status_code == 200
    assert not any(k.startswith(".thumbs/") for k in fake.objects), "no se limpió la caché de miniaturas"
