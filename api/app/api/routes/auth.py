import base64
import json
import logging
import uuid
from urllib.parse import quote

import httpx
from fastapi import (
    APIRouter,
    Cookie,
    Depends,
    File,
    HTTPException,
    Request,
    Response,
    UploadFile,
    status,
)
from fastapi.responses import RedirectResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import (
    get_current_user,
    get_current_user_context,
    issue_access_token,
    verify_csrf,
)
from app.api.rate_limit import _client_ip, rate_limit_ip
from app.core import minerva_session, oidc, refresh_token
from app.core.acervo_url import to_relative
from app.core.database import get_db
from app.core.security import crear_csrf_token, decodificar_token
from app.core.settings import get_settings
from app.models.acervo_bucket import AcervoBucket
from app.models.user import Usuario
from app.schemas.user import (
    CurrentUserResponse,
    PerfilUpdate,
    UsuarioResponse,
)
from app.services.acervo import AcervoClient
from app.services.actividad_service import registrar_actividad
from minerva_sdk.fastapi import _decode

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/autenticacion", tags=["autenticación"])
settings = get_settings()

TX_COOKIE_NAME = "mariachi_oidc_tx"
TX_MAX_AGE = 600

_UNUSABLE_PASSWORD = "!minerva"


def _tx_cookie_path() -> str:
    return f"{settings.admin_prefix}/autenticacion"


def _set_access_cookie(response: Response, username: str, sid: str) -> None:
    response.set_cookie(
        key=settings.cookie_name,
        value=issue_access_token(username, sid),
        max_age=settings.cookie_max_age,
        httponly=settings.cookie_httponly,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        domain=settings.cookie_domain,
    )


def _set_refresh_cookie(response: Response, raw: str) -> None:
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=raw,
        max_age=settings.refresh_cookie_max_age,
        httponly=settings.cookie_httponly,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        domain=settings.cookie_domain,
    )


def _issue_session_cookies(response: Response, username: str, sid: str) -> None:
    _set_access_cookie(response, username, sid)
    raw = refresh_token.issue(username, sid)
    if raw:
        _set_refresh_cookie(response, raw)


def _clear_session_cookies(response: Response) -> None:
    for key in (settings.cookie_name, settings.refresh_cookie_name):
        response.delete_cookie(
            key=key,
            httponly=settings.cookie_httponly,
            secure=settings.cookie_secure,
            samesite=settings.cookie_samesite,
            domain=settings.cookie_domain,
        )


def _set_tx_cookie(response: Response, data: dict) -> None:
    raw = base64.urlsafe_b64encode(json.dumps(data).encode("utf-8")).decode("ascii")
    response.set_cookie(
        key=TX_COOKIE_NAME,
        value=raw,
        max_age=TX_MAX_AGE,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path=_tx_cookie_path(),
    )


def _read_tx_cookie(request: Request) -> dict | None:
    raw = request.cookies.get(TX_COOKIE_NAME)
    if not raw:
        return None
    try:
        return json.loads(base64.urlsafe_b64decode(raw.encode("ascii")).decode("utf-8"))
    except Exception:
        return None


def _safe_next(raw: str | None) -> str:
    if not raw or not raw.startswith("/") or raw.startswith("//"):
        return ""
    return raw


def _login_forzado_url() -> str:
    """A donde vuelve el navegador despues del logout del panel: al login de
    mariachi con `forzar=1`, para que minerva pida credenciales de nuevo en vez
    de reconocer la sesion que su logout suave dejo viva.

    Se deriva del `redirect_uri` del callback, que ya trae la URL publica de
    mariachi y es la unica que minerva tiene registrada."""
    callback = settings.minerva_redirect_uri.rstrip("/")
    if callback.endswith("/callback"):
        return f"{callback[: -len('/callback')]}/login?forzar=1"
    return _post_login_url()


def _post_login_url(next_path: str = "", error: str = "") -> str:
    base = settings.minerva_post_login_url.rstrip("/")
    if error:
        return f"{base}/login?auth_error={quote(error)}"
    if next_path and next_path != "/":
        return f"{base}{next_path}"
    return f"{base}/"


def _unique_username(db: Session, candidate: str) -> str:
    base = (candidate or "usuario").strip().lower()[:50] or "usuario"
    username = base
    suffix = 1
    while db.query(Usuario).filter(func.lower(Usuario.username) == username).first():
        suffix += 1
        sufijo = str(suffix)
        username = f"{base[: 50 - len(sufijo)]}{sufijo}"
    return username


def resolve_user(db: Session, claims: dict) -> Usuario:
    sub = claims.get("sub")
    email = (claims.get("email") or "").strip()
    name = claims.get("name") or claims.get("preferred_username") or email

    usuario = db.query(Usuario).filter(Usuario.minerva_sub == sub).first()

    if usuario is None and email:
        usuario = (
            db.query(Usuario).filter(func.lower(Usuario.email) == email.lower()).first()
        )
        if usuario is not None:
            usuario.minerva_sub = sub

    if usuario is None:
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Minerva no entregó un correo con el que crear el usuario",
            )
        usuario = Usuario(
            minerva_sub=sub,
            username=_unique_username(db, email.split("@", 1)[0]),
            email=email,
            name=name or email,
            hashed_password=_UNUSABLE_PASSWORD,
            role="externo",
            must_change_password=False,
        )
        db.add(usuario)

    if email:
        usuario.email = email
    if name:
        usuario.name = name

    db.commit()
    db.refresh(usuario)
    return usuario


@router.get("/login")
async def login(request: Request, next: str = "", forzar: int = 0) -> RedirectResponse:
    state = oidc.generate_state()
    nonce = oidc.generate_nonce()
    verifier, challenge = oidc.generate_pkce()
    authorize_url = await oidc.build_authorize_url(
        state, challenge, nonce, prompt="login" if forzar else ""
    )

    redirect = RedirectResponse(url=authorize_url, status_code=status.HTTP_302_FOUND)
    _set_tx_cookie(
        redirect,
        {"state": state, "verifier": verifier, "nonce": nonce, "next": _safe_next(next)},
    )
    return redirect


@router.get("/callback")
async def callback(
    request: Request,
    code: str = "",
    state: str = "",
    error: str = "",
    db: Session = Depends(get_db),
) -> RedirectResponse:
    tx = _read_tx_cookie(request)
    next_path = _safe_next((tx or {}).get("next"))

    if error:
        logger.info("action=login.denied error=%s", error)
        redirect = RedirectResponse(
            url=_post_login_url(error=error), status_code=status.HTTP_302_FOUND
        )
        redirect.delete_cookie(key=TX_COOKIE_NAME, path=_tx_cookie_path())
        return redirect

    if not tx or not code or not state or state != tx.get("state"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Estado OIDC inválido"
        )

    try:
        tokens = await oidc.exchange_code(code, tx["verifier"])
    except httpx.HTTPError as exc:
        logger.warning("no se pudo canjear el code con minerva: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo canjear el código con Minerva",
        ) from exc

    claims = await _decode(tokens["access_token"])
    usuario = resolve_user(db, claims)

    sid = minerva_session.new_sid()
    minerva_session.store(
        sid,
        tokens["access_token"],
        tokens.get("refresh_token"),
        oidc.access_expiry(tokens.get("expires_in")),
    )

    redirect = RedirectResponse(
        url=_post_login_url(next_path), status_code=status.HTTP_302_FOUND
    )
    redirect.delete_cookie(key=TX_COOKIE_NAME, path=_tx_cookie_path())
    _issue_session_cookies(redirect, usuario.username, sid)

    logger.info("action=login.success user_id=%s", usuario.id)
    try:
        registrar_actividad(
            db,
            actor=usuario,
            action="login.success",
            resource_type="usuario",
            resource_id=usuario.id,
            metadata={"idp": "minerva"},
            ip=_client_ip(request),
        )
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.warning("actividad login.success fallo user_id=%s: %s", usuario.id, exc)

    return redirect


@router.post("/cerrar-sesion")
async def logout(
    response: Response,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
    refresh_cookie: str | None = Cookie(default=None, alias=settings.refresh_cookie_name),
):
    access_cookie = request.cookies.get(settings.cookie_name)
    sid = None
    if access_cookie:
        payload = decodificar_token(access_cookie)
        sid = (payload or {}).get("sid")

    if sid:
        try:
            record = minerva_session.load(sid)
        except minerva_session.MinervaSessionError:
            record = {}
        if record.get("refresh_token"):
            await oidc.revoke_refresh_token(record["refresh_token"])
        minerva_session.drop(sid)

    if refresh_cookie:
        refresh_token.revoke(refresh_cookie)
    _clear_session_cookies(response)

    try:
        registrar_actividad(
            db,
            actor=current_user,
            action="login.logout",
            resource_type="usuario",
            resource_id=current_user.id,
            ip=_client_ip(request),
        )
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.warning("actividad login.logout fallo user_id=%s: %s", current_user.id, exc)

    return {
        "message": "Sesión cerrada exitosamente",
        "logout_url": oidc.logout_url(_login_forzado_url()),
    }


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


@router.post(
    "/refrescar",
    dependencies=[Depends(rate_limit_ip(max_requests=30, window_seconds=60, scope='refresh'))],
)
async def refrescar_sesion(
    response: Response,
    db: Session = Depends(get_db),
    refresh_cookie: str | None = Cookie(default=None, alias=settings.refresh_cookie_name),
):
    if not refresh_cookie:
        _clear_session_cookies(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sesión expirada")

    try:
        new_raw, username, sid = refresh_token.rotate(refresh_cookie)
    except refresh_token.RefreshError as exc:
        _clear_session_cookies(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    usuario = db.query(Usuario).filter(Usuario.username == username).first()
    if usuario is None:
        refresh_token.revoke(new_raw)
        _clear_session_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se pudo validar las credenciales",
        )

    _set_access_cookie(response, username, sid)
    _set_refresh_cookie(response, new_raw)
    return {"csrf_token": crear_csrf_token(username)}


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
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"Avatar excede {_AVATAR_MAX_BYTES // (1024 * 1024)} MB",
        )

    bucket = (
        db.query(AcervoBucket)
        .filter(AcervoBucket.acervo_bucket == "iieg", AcervoBucket.is_active.is_(True))
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
