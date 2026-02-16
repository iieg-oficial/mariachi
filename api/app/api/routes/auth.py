from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import crear_access_token, crear_csrf_token, verify_password
from app.core.settings import get_settings
from app.models.user import Usuario
from app.schemas.user import LoginRequest, LoginResponse, UsuarioResponse

router = APIRouter(prefix="/auth", tags=["autenticación"])
settings = get_settings()


@router.post("/login", response_model=LoginResponse)
async def login(
    credentials: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    usuario = db.query(Usuario).filter(Usuario.username == credentials.username).first()

    if not usuario or not verify_password(credentials.password, usuario.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
        )

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

    return LoginResponse(
        csrf_token=csrf_token,
        user=UsuarioResponse.model_validate(usuario),
    )


@router.post("/logout")
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


@router.get("/me", response_model=UsuarioResponse)
async def get_current_user_info(current_user: Usuario = Depends(get_current_user)):
    return current_user


@router.get("/verify")
async def verify_token(current_user: Usuario = Depends(get_current_user)):
    return {"valid": True}
