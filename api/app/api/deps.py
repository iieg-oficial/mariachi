from fastapi import Cookie, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decodificar_token, verificar_csrf_token
from app.core.settings import get_settings
from app.models.media_bucket import MediaBucket
from app.models.project import Project, UserProject
from app.models.user import Usuario

settings = get_settings()

ADMIN_ROLE = "tetlamamakani"
STAFF_ROLES = {"tetlamamakani", "editora"}


async def get_current_user(
    request: Request,
    access_token: str | None = Cookie(default=None, alias=settings.cookie_name),
    db: Session = Depends(get_db),
) -> Usuario:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
    )

    if access_token is None:
        raise credentials_exception

    payload = decodificar_token(access_token)
    if payload is None:
        raise credentials_exception

    username: str | None = payload.get("sub")
    if username is None:
        raise credentials_exception

    usuario = db.query(Usuario).filter(Usuario.username == username).first()
    if usuario is None:
        raise credentials_exception

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


def require_role(allowed_roles: list[str]):
    async def role_checker(current_user: Usuario = Depends(get_current_user)) -> Usuario:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permisos insuficientes para esta operación",
            )
        return current_user

    return role_checker


async def require_staff(
    current_user: Usuario = Depends(get_current_user),
) -> Usuario:
    """Restringe a staff del IIEG (tetlamamakani o editora). Bloquea rol externo."""
    if current_user.role not in STAFF_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido al staff del IIEG",
        )
    return current_user


def _user_memberships(db: Session, user: Usuario) -> list[dict]:
    rows = (
        db.query(Project.slug, Project.name, UserProject.project_role)
        .join(UserProject, UserProject.project_id == Project.id)
        .filter(UserProject.user_id == user.id, Project.is_active.is_(True))
        .all()
    )
    return [{"slug": r.slug, "name": r.name, "project_role": r.project_role} for r in rows]


def _user_accessible_buckets(db: Session, user: Usuario) -> list[dict]:
    query = (
        db.query(MediaBucket, Project.slug)
        .join(Project, Project.id == MediaBucket.project_id)
        .filter(MediaBucket.is_active.is_(True), Project.is_active.is_(True))
    )
    if user.role != ADMIN_ROLE:
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
        "must_change_password": current_user.must_change_password,
        "created_at": current_user.created_at,
        "projects": _user_memberships(db, current_user),
        "accessible_buckets": _user_accessible_buckets(db, current_user),
    }
    return data


def require_project_access(project_slug: str, min_role: str | None = None):
    async def checker(
        current_user: Usuario = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> Usuario:
        if current_user.role == ADMIN_ROLE:
            return current_user

        project = (
            db.query(Project)
            .filter(Project.slug == project_slug, Project.is_active.is_(True))
            .first()
        )
        if project is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Proyecto '{project_slug}' no encontrado",
            )

        membership = (
            db.query(UserProject)
            .filter(
                UserProject.user_id == current_user.id,
                UserProject.project_id == project.id,
            )
            .first()
        )
        if membership is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Sin acceso al proyecto '{project_slug}'",
            )

        if min_role == "editor" and membership.project_role != "editor":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requiere rol editor en '{project_slug}'",
            )

        return current_user

    return checker


def require_bucket_access(bucket_id_param: str = "bucket_id"):
    async def checker(
        request: Request,
        current_user: Usuario = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> MediaBucket:
        bucket_id = request.path_params.get(bucket_id_param) or request.query_params.get(
            bucket_id_param
        )
        if bucket_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="bucket_id requerido",
            )

        bucket = (
            db.query(MediaBucket)
            .filter(MediaBucket.id == int(bucket_id), MediaBucket.is_active.is_(True))
            .first()
        )
        if bucket is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bucket no encontrado",
            )

        if current_user.role == ADMIN_ROLE:
            return bucket

        membership = (
            db.query(UserProject)
            .filter(
                UserProject.user_id == current_user.id,
                UserProject.project_id == bucket.project_id,
            )
            .first()
        )
        if membership is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sin acceso a este bucket",
            )

        return bucket

    return checker
