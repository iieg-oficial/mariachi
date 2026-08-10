import pytest
from fastapi import HTTPException

from app.models.acervo_bucket import AcervoBucket
from app.models.project import Project, UserProject
from app.services.acervo_file_service import resolve_bucket_escribible, resolve_bucket_or_403


def _bucket(db_session):
    project = Project(slug="portal", name="Portal", is_active=True)
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)

    bucket = AcervoBucket(
        project_id=project.id,
        acervo_bucket="portal-bucket",
        access_key_ref="portal-key",
        display_name="Portal Bucket",
    )
    db_session.add(bucket)
    db_session.commit()
    db_session.refresh(bucket)
    return bucket


def _con_membresia(db_session, user, bucket, project_role):
    db_session.add(
        UserProject(user_id=user.id, project_id=bucket.project_id, project_role=project_role)
    )
    db_session.commit()
    return bucket


def test_viewer_puede_leer(db_session, editora_user):
    bucket = _con_membresia(db_session, editora_user, _bucket(db_session), "viewer")
    assert resolve_bucket_or_403(bucket.id, editora_user, db_session).id == bucket.id


def test_viewer_no_puede_escribir(db_session, editora_user):
    bucket = _con_membresia(db_session, editora_user, _bucket(db_session), "viewer")
    with pytest.raises(HTTPException) as exc:
        resolve_bucket_escribible(bucket.id, editora_user, db_session)
    assert exc.value.status_code == 403


def test_editor_puede_escribir(db_session, editora_user):
    bucket = _con_membresia(db_session, editora_user, _bucket(db_session), "editor")
    assert resolve_bucket_escribible(bucket.id, editora_user, db_session).id == bucket.id


def test_acervo_manage_escribe_sin_membresia(db_session, admin_user):
    admin_user.permissions = {"mariachi.acervo.manage"}
    bucket = _bucket(db_session)
    assert resolve_bucket_escribible(bucket.id, admin_user, db_session).id == bucket.id


def test_sin_acervo_manage_ni_membresia_no_se_escribe(db_session, editora_user):
    editora_user.permissions = {"mariachi.acervo.view"}
    bucket = _bucket(db_session)
    with pytest.raises(HTTPException) as exc:
        resolve_bucket_escribible(bucket.id, editora_user, db_session)
    assert exc.value.status_code == 403
