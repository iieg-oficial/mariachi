import logging
import uuid
from datetime import timedelta

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import (
    get_current_user,
    get_current_user_context,
    list_user_memberships,
    verify_csrf,
)
from app.api.metrics import (
    COUNTER_LOGIN_FAILED,
    COUNTER_LOGIN_LOCKED,
    COUNTER_LOGIN_SUCCESS,
    incr,
)
from app.api.rate_limit import rate_limit_ip
from app.core.acervo_url import to_relative
from app.core.cache import redis_client
from app.core.database import get_db
from app.core.security import crear_access_token, crear_csrf_token, hash_password, verify_password
from app.core.settings import get_settings
from app.models.media_bucket import MediaBucket
from app.models.user import Usuario
from app.schemas.user import (
    CurrentUserResponse,
    LoginRequest,
    LoginResponse,
    PasswordChange,
    PerfilUpdate,
    UsuarioResponse,
)
from app.services.acervo import AcervoClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/autenticacion", tags=["autenticación"])
settings = get_settings()

_LOGIN_USERNAME_LOCKOUT_KEY = 'rate_limit:login:username:{}'
_LOGIN_USERNAME_MAX_FAILS = 5
_LOGIN_USERNAME_WINDOW_SECONDS = 300


def _username_lockout_key(identifier: str) -> str:
    return _LOGIN_USERNAME_LOCKOUT_KEY.format(identifier)


@router.post(
    "/iniciar-sesion",
    response_model=LoginResponse,
    dependencies=[Depends(rate_limit_ip(max_requests=10, window_seconds=60, scope='login'))],
)
async def login(
    credentials: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    identifier = (credentials.username or "").strip().lower()

    lockout_key = _username_lockout_key(identifier)
    try:
        fail_count = int(redis_client.get(lockout_key) or 0)
    except Exception as exc:
        logger.warning('login lockout redis error identifier=%s: %s', identifier, exc)
        fail_count = 0

    if fail_count >= _LOGIN_USERNAME_MAX_FAILS:
        try:
            ttl = redis_client.ttl(lockout_key)
        except Exception:
            ttl = _LOGIN_USERNAME_WINDOW_SECONDS
        retry = ttl if ttl and ttl > 0 else _LOGIN_USERNAME_WINDOW_SECONDS
        logger.warning('login locked identifier=%s fails=%s', identifier, fail_count)
        incr(COUNTER_LOGIN_LOCKED)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Cuenta temporalmente bloqueada por intentos fallidos. Intenta en {retry}s.",
            headers={"Retry-After": str(retry)},
        )

    usuario = (
        db.query(Usuario)
        .filter(
            (func.lower(Usuario.username) == identifier)
            | (func.lower(Usuario.email) == identifier)
        )
        .first()
    )

    if not usuario or not verify_password(credentials.password, usuario.hashed_password):
        try:
            pipe = redis_client.pipeline()
            pipe.incr(lockout_key)
            pipe.expire(lockout_key, _LOGIN_USERNAME_WINDOW_SECONDS)
            pipe.execute()
        except Exception as exc:
            logger.warning('login lockout incr error identifier=%s: %s', identifier, exc)
        logger.info('action=login.failed identifier=%s', identifier)
        incr(COUNTER_LOGIN_FAILED)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
        )

    try:
        redis_client.delete(lockout_key)
    except Exception:
        pass
    incr(COUNTER_LOGIN_SUCCESS)

    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = crear_access_token(
        data={"sub": usuario.username}, expires_delta=access_token_expires
    )

    response.set_cookie(
        key=settings.cookie_name,
        value=access_token,
        max_age=settings.cookie_max_age,
        httponly=settings.cookie_httponly,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        domain=settings.cookie_domain,
    )

    csrf_token = crear_csrf_token(usuario.username)

    user_payload = UsuarioResponse.model_validate(usuario).model_dump()
    user_payload["projects"] = list_user_memberships(db, usuario)

    logger.info('action=login.success user_id=%s role=%s', usuario.id, usuario.role)

    return LoginResponse(
        csrf_token=csrf_token,
        user=UsuarioResponse.model_validate(user_payload),
    )


@router.post("/cerrar-sesion")
async def logout(
    response: Response,
    current_user: Usuario = Depends(get_current_user),
):
    response.delete_cookie(
        key=settings.cookie_name,
        httponly=settings.cookie_httponly,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        domain=settings.cookie_domain,
    )
    return {"message": "Sesión cerrada exitosamente"}


@router.get("/perfil", response_model=CurrentUserResponse)
async def get_current_user_info(
    context: dict = Depends(get_current_user_context),
):
    return context


@router.put("/perfil", response_model=UsuarioResponse)
async def actualizar_perfil(
    payload: PerfilUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    data = payload.model_dump(exclude_unset=True)

    if "email" in data and data["email"]:
        data["email"] = data["email"].strip().lower()
        if data["email"] != current_user.email:
            existing = (
                db.query(Usuario)
                .filter(func.lower(Usuario.email) == data["email"], Usuario.id != current_user.id)
                .first()
            )
            if existing:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email ya está en uso")

    for field, value in data.items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/verificar")
async def verify_token(current_user: Usuario = Depends(get_current_user)):
    return {"valid": True}


@router.get("/csrf")
async def refrescar_csrf(current_user: Usuario = Depends(get_current_user)):
    return {"csrf_token": crear_csrf_token(current_user.username)}


_AVATAR_ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}
_AVATAR_MAX_BYTES = 2 * 1024 * 1024


def _avatar_extension(content_type: str) -> str:
    return {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
    }.get(content_type, "bin")


@router.post("/perfil/avatar", response_model=UsuarioResponse)
async def subir_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    if file.content_type not in _AVATAR_ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo no permitido. Use {', '.join(sorted(_AVATAR_ALLOWED_CONTENT_TYPES))}",
        )

    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    if size > _AVATAR_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Avatar excede {_AVATAR_MAX_BYTES // (1024 * 1024)} MB",
        )

    bucket = (
        db.query(MediaBucket)
        .filter(MediaBucket.acervo_bucket == "iieg", MediaBucket.is_active.is_(True))
        .first()
    )
    if bucket is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Bucket de assets institucionales no disponible",
        )

    ext = _avatar_extension(file.content_type)
    object_name = f"avatars/u{current_user.id}/{uuid.uuid4().hex}.{ext}"

    client = AcervoClient.for_bucket(bucket)
    public_url = await client.upload_file(file, object_name)

    if current_user.avatar_url:
        previous_relative = to_relative(current_user.avatar_url)
        if previous_relative and previous_relative.startswith(f"iieg/avatars/u{current_user.id}/"):
            old_object = previous_relative[len("iieg/"):]
            client.delete_file(old_object)

    current_user.avatar_url = to_relative(public_url)
    db.commit()
    db.refresh(current_user)
    logger.info('action=user.avatar_upload user_id=%s object=%s', current_user.id, object_name)
    return UsuarioResponse.model_validate(current_user)


@router.post("/cambiar-contrasena")
async def cambiar_contrasena(
    password_data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contraseña actual incorrecta",
        )

    from app.core.time import utcnow

    current_user.hashed_password = hash_password(password_data.new_password)
    current_user.must_change_password = False
    current_user.password_changed_at = utcnow()
    db.commit()
    logger.info('action=user.change_password user_id=%s', current_user.id)

    return {"message": "Contraseña actualizada exitosamente"}
