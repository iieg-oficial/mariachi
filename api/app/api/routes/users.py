import secrets
import string

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_role, verify_csrf
from app.core.security import hash_password, verify_password
from app.models.user import Usuario
from app.schemas.user import PasswordChange, PasswordReset, UsuarioCreate, UsuarioResponse, UsuarioUpdate

router = APIRouter(prefix="/usuarios", tags=["usuarios"])


def generate_temp_password(length=12):
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


@router.get("", response_model=list[UsuarioResponse])
async def listar_usuarios(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: Usuario = Depends(get_current_user),
):
    usuarios = db.query(Usuario).offset(skip).limit(limit).all()
    return usuarios


@router.get("/{usuario_id}", response_model=UsuarioResponse)
async def obtener_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado"
        )
    return usuario


@router.post("", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
async def crear_usuario(
    usuario_in: UsuarioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    if current_user.role not in ["tetlamamakani"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permisos insuficientes para esta operación",
        )
    usuario_existente = (
        db.query(Usuario).filter(Usuario.username == usuario_in.username).first()
    )
    if usuario_existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="El nombre de usuario ya existe"
        )

    email_existente = db.query(Usuario).filter(Usuario.email == usuario_in.email).first()
    if email_existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="El email ya está registrado"
        )

    usuario_data = usuario_in.model_dump(exclude={"password"})
    usuario_data["hashed_password"] = hash_password(usuario_in.password)
    usuario_data["must_change_password"] = True

    nuevo_usuario = Usuario(**usuario_data)
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)

    return nuevo_usuario


@router.put("/{usuario_id}", response_model=UsuarioResponse)
async def actualizar_usuario(
    usuario_id: int,
    usuario_in: UsuarioUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado"
        )

    if current_user.role != "tetlamamakani" and current_user.id != usuario_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Permisos insuficientes"
        )

    # Check if username or email is being changed to an existing one
    if (
        usuario_in.username
        and usuario_in.username != usuario.username
        and db.query(Usuario).filter(Usuario.username == usuario_in.username).first()
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="El nombre de usuario ya existe"
        )
    if (
        usuario_in.email
        and usuario_in.email != usuario.email
        and db.query(Usuario).filter(Usuario.email == usuario_in.email).first()
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="El email ya está registrado"
        )

    update_data = usuario_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(usuario, field, value)

    db.commit()
    db.refresh(usuario)
    return usuario


@router.post("/{usuario_id}/restablecer-contrasena")
async def resetear_password(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    if current_user.role != "tetlamamakani":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden resetear contraseñas"
        )

    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado"
        )

    temp_password = generate_temp_password()
    usuario.hashed_password = hash_password(temp_password)
    usuario.must_change_password = True
    db.commit()

    return {
        "message": "Contraseña reseteada exitosamente",
        "temp_password": temp_password
    }


@router.post("/cambiar-contrasena")
async def cambiar_password(
    password_data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contraseña actual incorrecta"
        )

    current_user.hashed_password = hash_password(password_data.new_password)
    current_user.must_change_password = False
    db.commit()

    return {"message": "Contraseña actualizada exitosamente"}


@router.delete("/{usuario_id}")
async def eliminar_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    if current_user.role not in ["tetlamamakani"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permisos insuficientes para esta operación",
        )
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado"
        )

    if usuario.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes eliminar tu propio usuario",
        )

    db.delete(usuario)
    db.commit()
    return {"message": "Usuario eliminado exitosamente"}
