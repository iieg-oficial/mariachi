from app.models.media_bucket import MediaBucket
from app.models.project import Project, UserProject
from tests.conftest import ADMIN_PREFIX


def _seed_buckets(db_session):
    portal = Project(slug="portal", name="Portal", is_active=True)
    mapalab = Project(slug="mapalab", name="Mapalab", is_active=True)
    db_session.add_all([portal, mapalab])
    db_session.commit()
    db_session.refresh(portal)
    db_session.refresh(mapalab)

    portal_bucket = MediaBucket(
        project_id=portal.id,
        acervo_bucket="portal-bucket",
        access_key_ref="portal-key",
        display_name="Portal Bucket",
    )
    mapalab_bucket = MediaBucket(
        project_id=mapalab.id,
        acervo_bucket="mapalab-bucket",
        access_key_ref="mapalab-key",
        display_name="Mapalab Bucket",
    )
    inactivo = MediaBucket(
        project_id=portal.id,
        acervo_bucket="inactivo-bucket",
        access_key_ref="inactivo-key",
        display_name="Inactivo",
        is_active=False,
    )
    db_session.add_all([portal_bucket, mapalab_bucket, inactivo])
    db_session.commit()
    db_session.refresh(portal_bucket)
    db_session.refresh(mapalab_bucket)
    return portal, mapalab, portal_bucket, mapalab_bucket


def test_list_buckets_requires_auth(client):
    response = client.get(f"{ADMIN_PREFIX}/media-buckets")
    assert response.status_code == 401


def test_list_buckets_admin_sees_all_active(admin_session, db_session):
    _seed_buckets(db_session)
    client = admin_session["client"]
    response = client.get(f"{ADMIN_PREFIX}/media-buckets")
    assert response.status_code == 200
    names = sorted([b["acervo_bucket"] for b in response.json()])
    assert names == ["mapalab-bucket", "portal-bucket"]


def test_list_buckets_editora_filtered_by_membership(
    editora_session, db_session, editora_user
):
    portal, _, _, _ = _seed_buckets(db_session)
    db_session.add(
        UserProject(user_id=editora_user.id, project_id=portal.id, project_role="editor")
    )
    db_session.commit()

    client = editora_session["client"]
    response = client.get(f"{ADMIN_PREFIX}/media-buckets")
    assert response.status_code == 200
    names = [b["acervo_bucket"] for b in response.json()]
    assert names == ["portal-bucket"]


def test_list_buckets_editora_without_membership_empty(editora_session, db_session):
    _seed_buckets(db_session)
    client = editora_session["client"]
    response = client.get(f"{ADMIN_PREFIX}/media-buckets")
    assert response.status_code == 200
    assert response.json() == []


def test_create_bucket_admin_ok(admin_session, db_session):
    portal, _, _, _ = _seed_buckets(db_session)
    client = admin_session["client"]
    response = client.post(
        f"{ADMIN_PREFIX}/media-buckets",
        json={
            "project_id": portal.id,
            "acervo_bucket": "nuevo-bucket",
            "access_key_ref": "nuevo-key",
            "display_name": "Nuevo Bucket",
        },
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 201
    assert response.json()["acervo_bucket"] == "nuevo-bucket"


def test_create_bucket_editora_forbidden(editora_session, db_session):
    portal, _, _, _ = _seed_buckets(db_session)
    client = editora_session["client"]
    response = client.post(
        f"{ADMIN_PREFIX}/media-buckets",
        json={
            "project_id": portal.id,
            "acervo_bucket": "hack-bucket",
            "access_key_ref": "hack-key",
            "display_name": "Hack",
        },
        headers={"X-CSRF-Token": editora_session["csrf"]},
    )
    assert response.status_code == 403


def test_create_bucket_invalid_project(admin_session):
    client = admin_session["client"]
    response = client.post(
        f"{ADMIN_PREFIX}/media-buckets",
        json={
            "project_id": 9999,
            "acervo_bucket": "nuevo-bucket",
            "access_key_ref": "nuevo-key",
            "display_name": "Nuevo",
        },
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 400


def test_update_bucket_admin_ok(admin_session, db_session):
    _, _, portal_bucket, _ = _seed_buckets(db_session)
    client = admin_session["client"]
    response = client.patch(
        f"{ADMIN_PREFIX}/media-buckets/{portal_bucket.id}",
        json={"display_name": "Renombrado"},
        headers={"X-CSRF-Token": admin_session["csrf"]},
    )
    assert response.status_code == 200
    assert response.json()["display_name"] == "Renombrado"


def test_update_bucket_editora_forbidden(editora_session, db_session):
    _, _, portal_bucket, _ = _seed_buckets(db_session)
    client = editora_session["client"]
    response = client.patch(
        f"{ADMIN_PREFIX}/media-buckets/{portal_bucket.id}",
        json={"display_name": "Hack"},
        headers={"X-CSRF-Token": editora_session["csrf"]},
    )
    assert response.status_code == 403
