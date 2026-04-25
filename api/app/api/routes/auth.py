from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_current_user_context, verify_csrf
from app.core.database import get_db
from app.core.security import crear_access_token, crear_csrf_token, hash_password, verify_password
from app.core.settings import get_settings
from app.models.user import Usuario
from app.schemas.user import CurrentUserResponse, LoginRequest, LoginResponse, PasswordChange, UsuarioResponse

router = APIRouter(prefix="/autenticacion", tags=["autenticación"])
settings = get_settings()


@router.post("/iniciar-sesion", response_model=LoginResponse)
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


@router.get("/verificar")
async def verify_token(current_user: Usuario = Depends(get_current_user)):
    return {"valid": True}


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

    current_user.hashed_password = hash_password(password_data.new_password)
    current_user.must_change_password = False
    db.commit()

    return {"message": "Contraseña actualizada exitosamente"}
