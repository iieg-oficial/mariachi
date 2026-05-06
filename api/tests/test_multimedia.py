import io
from unittest.mock import patch

import pytest

from app.models.media import Media, MediaFolder
from app.models.media_bucket import MediaBucket
from app.models.project import Project, UserProject
from tests.conftest import ADMIN_PREFIX


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
        }
        return f"http://fake/{object_name}"

    def list_objects(self, prefix="", recursive=True):
        return [
            v for k, v in self.objects.items() if k.startswith(prefix or "")
        ]

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


@pytest.fixture(autouse=True)
def patch_acervo():
    FakeAcervoClient.reset()
    with patch("app.api.routes.media.AcervoClient", FakeAcervoClient), \
         patch("app.services.media_service.AcervoClient", FakeAcervoClient):
        yield


def _seed_bucket(db_session, *, name="mariachi", is_public=False):
    project = Project(slug=f"proj-{name}", name=name.title(), is_active=True)
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)

    bucket = MediaBucket(
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
    response = client.get(f"{ADMIN_PREFIX}/multimedia/carpetas")
    assert response.status_code == 422


def test_listar_carpetas_filters_by_bucket(admin_session, db_session):
    _, bucket_a = _seed_bucket(db_session, name="bucket-a")
    _, bucket_b = _seed_bucket(db_session, name="bucket-b")
    db_session.add_all([
        MediaFolder(bucket_id=bucket_a.id, name="docs", path="/docs/", parent=None),
        MediaFolder(bucket_id=bucket_b.id, name="img", path="/img/", parent=None),
    ])
    db_session.commit()

    client = admin_session["client"]
    response = client.get(f"{ADMIN_PREFIX}/multimedia/carpetas?bucket_id={bucket_a.id}")
    assert response.status_code == 200
    body = response.json()
    assert [f["path"] for f in body] == ["/docs/"]
    assert body[0]["bucket_id"] == bucket_a.id


def test_crear_carpeta_scoped_to_bucket(admin_session, db_session):
    _, bucket = _seed_bucket(db_session, name="x")
    client = admin_session["client"]
    response = client.post(
        f"{ADMIN_PREFIX}/multimedia/carpetas",
        json={"bucket_id": bucket.id, "name": "videos", "parent": None},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 201
    assert response.json()["path"] == "/videos"
    assert response.json()["bucket_id"] == bucket.id


def test_crear_carpeta_duplicada_409(admin_session, db_session):
    _, bucket = _seed_bucket(db_session, name="x")
    db_session.add(
        MediaFolder(bucket_id=bucket.id, name="videos", path="/videos", parent=None)
    )
    db_session.commit()

    client = admin_session["client"]
    response = client.post(
        f"{ADMIN_PREFIX}/multimedia/carpetas",
        json={"bucket_id": bucket.id, "name": "videos", "parent": None},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 409


def test_eliminar_carpeta_vacia_ok(admin_session, db_session):
    _, bucket = _seed_bucket(db_session, name="x")
    folder = MediaFolder(bucket_id=bucket.id, name="docs", path="/docs/", parent=None)
    db_session.add(folder)
    db_session.commit()
    db_session.refresh(folder)

    client = admin_session["client"]
    response = client.delete(
        f"{ADMIN_PREFIX}/multimedia/carpetas/{folder.id}",
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 200
    assert db_session.query(MediaFolder).filter(MediaFolder.id == folder.id).first() is None


def test_eliminar_carpeta_con_archivos_409(admin_session, db_session, admin_user):
    _, bucket = _seed_bucket(db_session, name="x")
    folder = MediaFolder(bucket_id=bucket.id, name="docs", path="/docs/", parent=None)
    media = Media(
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
        f"{ADMIN_PREFIX}/multimedia/carpetas/{folder.id}",
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 409


def test_subir_archivo_a_raiz_no_rompe(admin_session, db_session):
    _, bucket = _seed_bucket(db_session, name="x")
    client = admin_session["client"]
    response = client.post(
        f"{ADMIN_PREFIX}/multimedia",
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
        f"{ADMIN_PREFIX}/multimedia",
        data={"folder": "imagenes", "alt": "logo", "bucket_id": str(bucket.id)},
        files={"file": ("logo.png", io.BytesIO(b"\x89PNG..."), "image/png")},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 201
    folder_row = (
        db_session.query(MediaFolder)
        .filter(MediaFolder.bucket_id == bucket.id, MediaFolder.path == "imagenes/")
        .first()
    )
    assert folder_row is not None


def test_actualizar_archivo_metadata(admin_session, db_session, admin_user):
    _, bucket = _seed_bucket(db_session, name="x")
    media = Media(
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
        f"{ADMIN_PREFIX}/multimedia/{media.id}",
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

    media = Media(
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
        f"{ADMIN_PREFIX}/multimedia/{media.id}",
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 200
    assert db_session.query(Media).filter(Media.id == media.id).first() is None


def test_eliminar_directorio_admin(admin_session, db_session):
    _, bucket = _seed_bucket(db_session, name="x")
    client = admin_session["client"]
    client.post(
        f"{ADMIN_PREFIX}/multimedia",
        data={"folder": "tmp", "alt": "", "bucket_id": str(bucket.id)},
        files={"file": ("a.txt", io.BytesIO(b"hi"), "text/plain")},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )

    response = client.delete(
        f"{ADMIN_PREFIX}/multimedia/dir:{bucket.id}:tmp/",
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
        f"{ADMIN_PREFIX}/multimedia/dir:{bucket.id}:tmp/",
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
    response = client.get(f"{ADMIN_PREFIX}/multimedia?bucket_id={bucket.id}&recursive=true")
    assert response.status_code == 200
    names = [item["name"] for item in response.json()]
    assert "docs/manual.pdf" in names
    assert all(not n.startswith("reportes/") for n in names)


def test_proxy_object_unauth_401(client, db_session):
    _, bucket = _seed_bucket(db_session, name="x")
    response = client.get(f"{ADMIN_PREFIX}/multimedia/proxy/{bucket.id}/a.txt")
    assert response.status_code == 401
