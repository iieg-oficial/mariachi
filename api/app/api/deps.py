import logging

import httpx
from fastapi import Cookie, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core import minerva_session, oidc
from app.core.database import get_db
from app.core.security import crear_access_token, decodificar_token, verificar_csrf_token
from app.core.settings import get_settings
from app.core.time import utcnow
from app.models.acervo_bucket import AcervoBucket
from app.models.project import Project, UserProject
from app.models.user import Usuario
from minerva_sdk.config import settings as minerva_settings
from minerva_sdk.fastapi import _decode, _fetch_permissions

logger = logging.getLogger(__name__)
settings = get_settings()


def _credentials_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
    )


async def _minerva_access_token(sid: str) -> str:
    try:
        record = minerva_session.load(sid)
    except minerva_session.MinervaSessionError as exc:
        raise _credentials_exception() from exc

    if record.get("expires_at", 0) > utcnow().timestamp():
        return record["access_token"]

    refresh = record.get("refresh_token")
    if not refresh:
        minerva_session.drop(sid)
        raise _credentials_exception()

    try:
        tokens = await oidc.refresh_access_token(refresh)
    except httpx.HTTPError as exc:
        logger.info("minerva refresh fallido sid=%s: %s", sid, exc)
        minerva_session.drop(sid)
        raise _credentials_exception() from exc

    access_token = tokens["access_token"]
    minerva_session.store(
        sid,
        access_token,
        tokens.get("refresh_token", refresh),
        oidc.access_expiry(tokens.get("expires_in")),
    )
    return access_token


async def get_current_user(
    request: Request,
    access_token: str | None = Cookie(default=None, alias=settings.cookie_name),
    db: Session = Depends(get_db),
) -> Usuario:
    if access_token is None:
        raise _credentials_exception()

    payload = decodificar_token(access_token)
    if payload is None:
        raise _credentials_exception()

    username: str | None = payload.get("sub")
    sid: str | None = payload.get("sid")
    if username is None or sid is None:
        raise _credentials_exception()

    minerva_token = await _minerva_access_token(sid)
    try:
        claims = await _decode(minerva_token)
        permissions = await _fetch_permissions(
            minerva_token, claims, minerva_settings.application_code
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("minerva validacion fallida sid=%s: %s", sid, exc)
        raise _credentials_exception() from exc

    usuario = db.query(Usuario).filter(Usuario.username == username).first()
    if usuario is None:
        raise _credentials_exception()

    usuario.permissions = permissions
    usuario.minerva_claims = claims
    usuario.token_exp = payload.get("exp")
    return usuario


async def verify_csrf(
    request: Request,
    current_user: Usuario = Depends(get_current_user),
):
    if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
        csrf_token = request.headers.get("X-CSRF-Token")
        if not csrf_token:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token requerido",
            )

        if not verificar_csrf_token(csrf_token, current_user.username):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token inválido",
            )

    return current_user


def session_seconds_left(user: Usuario) -> int:
    exp = getattr(user, "token_exp", None)
    if not exp:
        return settings.access_token_expire_minutes * 60
    return max(0, int(exp - utcnow().timestamp()))


def has_permission(user: Usuario, permission: str) -> bool:
    return permission in getattr(user, "permissions", set())


def require_permission(permission: str):
    async def checker(current_user: Usuario = Depends(get_current_user)) -> Usuario:
        if not has_permission(current_user, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requiere permiso: {permission}",
            )
        return current_user

    return checker


PANEL_PERMISSIONS = (
    "mariachi.mapalab.view",
    "mariachi.mapalab_llaves.manage",
    "mariachi.mapalab_propuestas.approve",
    "mariachi.portal.view",
    "mariachi.sieej_admin.view",
    "mariachi.acervo.view",
    "mariachi.colibri_reportes.view",
    "mariachi.colibri_config.manage",
    "mariachi.mel.view",
    "mariachi.identidad.view",
    "mariachi.geoserver.view",
    "mariachi.actividad.view",
    "mariachi.usuarios.view",
    "mariachi.sistema.manage",
    "mariachi.vine.view",
    "mariachi.frames.view",
    "mariachi.intranet.view",
)


def require_any_permission(*permissions: str):
    async def checker(current_user: Usuario = Depends(get_current_user)) -> Usuario:
        if not any(has_permission(current_user, perm) for perm in permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requiere alguno de: {', '.join(permissions)}",
            )
        return current_user

    return checker


def require_panel_access():
    return require_any_permission(*PANEL_PERMISSIONS)


def issue_access_token(username: str, sid: str) -> str:
    return crear_access_token(data={"sub": username, "sid": sid})


def list_user_memberships(db: Session, user: Usuario) -> list[dict]:
    rows = (
        db.query(Project.slug, Project.name, UserProject.project_role)
        .join(UserProject, UserProject.project_id == Project.id)
        .filter(UserProject.user_id == user.id, Project.is_active.is_(True))
        .all()
    )
    return [{"slug": r.slug, "name": r.name, "project_role": r.project_role} for r in rows]


def list_user_accessible_buckets(db: Session, user: Usuario) -> list[dict]:
    query = (
        db.query(AcervoBucket, Project.slug)
        .join(Project, Project.id == AcervoBucket.project_id)
        .filter(AcervoBucket.is_active.is_(True), Project.is_active.is_(True))
    )
    if not has_permission(user, "mariachi.acervo.manage"):
        query = query.join(
            UserProject,
            (UserProject.project_id == Project.id) & (UserProject.user_id == user.id),
        )
    return [
        {
            "id": bucket.id,
            "acervo_bucket": bucket.acervo_bucket,
            "display_name": bucket.display_name,
            "project_slug": slug,
            "is_public": bucket.is_public,
        }
        for bucket, slug in query.all()
    ]


async def get_current_user_context(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    data = {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "name": current_user.name,
        "role": current_user.role,
        "permissions": sorted(getattr(current_user, "permissions", set())),
        "must_change_password": current_user.must_change_password,
        "avatar_url": current_user.avatar_url,
        "created_at": current_user.created_at,
        "projects": list_user_memberships(db, current_user),
        "accessible_buckets": list_user_accessible_buckets(db, current_user),
        "session_expires_in": session_seconds_left(current_user),
    }
    return data
