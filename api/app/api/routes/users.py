import logging
import secrets
import string

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_role, verify_csrf
from app.api.metrics import COUNTER_USER_WRITES, incr
from app.core.security import hash_password
from app.models.project import Project, UserProject
from app.models.user import Usuario
from app.schemas.user import (
    DependenciaSieejCreate,
    DependenciaSieejResponse,
    UsuarioCreate,
    UsuarioResponse,
    UsuarioUpdate,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/usuarios", tags=["usuarios"])

_require_admin = require_role(["tetlamamakani"])


def generate_temp_password(length=12):
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def _user_memberships(db: Session, user_id: int) -> list[dict]:
    rows = (
        db.query(Project.slug, Project.name, UserProject.project_role)
        .join(UserProject, UserProject.project_id == Project.id)
        .filter(UserProject.user_id == user_id)
        .all()
    )
    return [{"slug": r.slug, "name": r.name, "project_role": r.project_role} for r in rows]


def _serialize_user(db: Session, user: Usuario) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "must_change_password": user.must_change_password,
        "created_at": user.created_at,
        "projects": _user_memberships(db, user.id),
    }


def _apply_assignments(
    db: Session, user_id: int, assignments: list, commit: bool = False
) -> None:
    if assignments is None:
        return
    slugs = [a.project_slug for a in assignments]
    projects = db.query(Project).filter(Project.slug.in_(slugs)).all()
    slug_to_id = {p.slug: p.id for p in projects}
    missing = [s for s in slugs if s not in slug_to_id]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"proyectos no encontrados: {missing}",
        )
    db.query(UserProject).filter(UserProject.user_id == user_id).delete()
    for a in assignments:
        db.add(
            UserProject(
                user_id=user_id,
                project_id=slug_to_id[a.project_slug],
                project_role=a.project_role,
            )
        )
    if commit:
        db.commit()


@router.get("", response_model=list[UsuarioResponse])
async def listar_usuarios(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: Usuario = Depends(get_current_user),
):
    usuarios = db.query(Usuario).offset(skip).limit(limit).all()
    return [_serialize_user(db, u) for u in usuarios]


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
    return _serialize_user(db, usuario)


@router.post("", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
async def crear_usuario(
    usuario_in: UsuarioCreate,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
    current_user: Usuario = Depends(_require_admin),
):
    if db.query(Usuario).filter(Usuario.username == usuario_in.username).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="El nombre de usuario ya existe"
        )
    if db.query(Usuario).filter(Usuario.email == usuario_in.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="El email ya está registrado"
        )

    usuario_data = usuario_in.model_dump(exclude={"password", "project_assignments"})
    usuario_data["hashed_password"] = hash_password(usuario_in.password)
    usuario_data["must_change_password"] = True

    nuevo_usuario = Usuario(**usuario_data)
    db.add(nuevo_usuario)
    db.flush()

    _apply_assignments(db, nuevo_usuario.id, usuario_in.project_assignments)

    db.commit()
    db.refresh(nuevo_usuario)
    incr(COUNTER_USER_WRITES)
    logger.info("action=user.create actor=%s new_user=%s role=%s", current_user.id, nuevo_usuario.id, nuevo_usuario.role)
    return _serialize_user(db, nuevo_usuario)


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

    update_data = usuario_in.model_dump(exclude_unset=True, exclude={"project_assignments"})
    for field, value in update_data.items():
        setattr(usuario, field, value)

    if current_user.role == "tetlamamakani" and usuario_in.project_assignments is not None:
        _apply_assignments(db, usuario.id, usuario_in.project_assignments)

    db.commit()
    db.refresh(usuario)
    incr(COUNTER_USER_WRITES)
    logger.info("action=user.update actor=%s target=%s", current_user.id, usuario.id)
    return _serialize_user(db, usuario)


@router.post("/{usuario_id}/restablecer-contrasena")
async def resetear_password(
    usuario_id: int,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(_require_admin),
):
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


@router.post("/agregar-dependencia-sieej", response_model=DependenciaSieejResponse, status_code=status.HTTP_201_CREATED)
async def agregar_dependencia_sieej(
    payload: DependenciaSieejCreate,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
    current_user: Usuario = Depends(_require_admin),
):
    if db.query(Usuario).filter(Usuario.username == payload.username).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="El nombre de usuario ya existe"
        )
    if db.query(Usuario).filter(Usuario.email == payload.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="El email ya está registrado"
        )

    sieej_project = db.query(Project).filter(Project.slug == "sieej").first()
    if sieej_project is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Proyecto sieej no esta seedeado",
        )

    temp_password = generate_temp_password()
    nuevo = Usuario(
        username=payload.username,
        email=payload.email,
        name=payload.name,
        hashed_password=hash_password(temp_password),
        role="externo",
        must_change_password=True,
    )
    db.add(nuevo)
    db.flush()

    db.add(UserProject(user_id=nuevo.id, project_id=sieej_project.id, project_role="editor"))
    db.commit()
    db.refresh(nuevo)
    incr(COUNTER_USER_WRITES)
    logger.info("action=user.create_dependencia_sieej actor=%s new_user=%s", current_user.id, nuevo.id)

    return DependenciaSieejResponse(
        user=UsuarioResponse.model_validate(_serialize_user(db, nuevo)),
        temp_password=temp_password,
    )




@router.delete("/{usuario_id}")
async def eliminar_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
    current_user: Usuario = Depends(_require_admin),
):
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
    incr(COUNTER_USER_WRITES)
    logger.info("action=user.delete actor=%s target=%s", current_user.id, usuario.id)
    return {"message": "Usuario eliminado exitosamente"}
