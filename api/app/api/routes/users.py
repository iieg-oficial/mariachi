import logging
import secrets
import string

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import ADMIN_ROLE, get_current_user, get_db, require_role, verify_csrf
from app.api.metrics import COUNTER_USER_WRITES, incr
from app.core.security import hash_password
from app.models.project import Project, UserProject
from app.models.user import Usuario
from app.schemas.user import (
    UsuarioCreate,
    UsuarioResponse,
    UsuarioUpdate,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/usuarios", tags=["usuarios"])

_require_admin = require_role([ADMIN_ROLE])

_SELF_UPDATE_PRIVILEGED_FIELDS = frozenset({"role", "username", "must_change_password"})


def generate_temp_password(length=12):
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def _normalize_identifier(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().lower()
    return normalized or None


def _user_memberships(db: Session, user_id: int) -> list[dict]:
    rows = (
        db.query(Project.slug, Project.name, UserProject.project_role)
        .join(UserProject, UserProject.project_id == Project.id)
        .filter(UserProject.user_id == user_id)
        .all()
    )
    return [{"slug": r.slug, "name": r.name, "project_role": r.project_role} for r in rows]


def _mask_email(email: str | None) -> str | None:
    """Devuelve el email enmascarado: a***@d***.gob.mx -> a***@***.gob.mx."""
    if not email or "@" not in email:
        return email
    local, _, domain = email.partition("@")
    if len(local) <= 1:
        masked_local = local
    else:
        masked_local = local[0] + "*" * (len(local) - 1)
    if "." in domain:
        head, _, tail = domain.partition(".")
        masked_domain = "*" * max(len(head), 1) + "." + tail
    else:
        masked_domain = "*" * len(domain)
    return f"{masked_local}@{masked_domain}"


def _serialize_user(db: Session, user: Usuario, *, viewer: Usuario | None = None) -> dict:
    """Serializa el usuario aplicando privacidad por rol del viewer.

    - Admin (`tetlamamakani`): ve todo.
    - Editora viendo a otro: email enmascarado y proyectos ocultos (estos
      son detalles operativos que la editora no necesita para su trabajo
      del dia a dia; el admin sigue gestionando asignaciones).
    - Editora viendose a si misma: ve todo (su propio perfil).
    """
    is_admin = viewer is not None and viewer.role == ADMIN_ROLE
    is_self = viewer is not None and viewer.id == user.id
    show_full = is_admin or is_self

    email = user.email if show_full else _mask_email(user.email)
    projects = _user_memberships(db, user.id) if show_full else []

    return {
        "id": user.id,
        "username": user.username,
        "email": email,
        "name": user.name,
        "role": user.role,
        "must_change_password": user.must_change_password,
        "created_at": user.created_at,
        "projects": projects,
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
    return [_serialize_user(db, u, viewer=current_user) for u in usuarios]


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
    return _serialize_user(db, usuario, viewer=current_user)


@router.post("", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
async def crear_usuario(
    usuario_in: UsuarioCreate,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
    current_user: Usuario = Depends(_require_admin),
):
    username = _normalize_identifier(usuario_in.username)
    email = _normalize_identifier(usuario_in.email)
    if db.query(Usuario).filter(func.lower(Usuario.username) == username).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="El nombre de usuario ya existe"
        )
    if db.query(Usuario).filter(func.lower(Usuario.email) == email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="El email ya está registrado"
        )

    usuario_data = usuario_in.model_dump(exclude={"password", "project_assignments"})
    usuario_data["username"] = username
    usuario_data["email"] = email
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
    return _serialize_user(db, nuevo_usuario, viewer=current_user)


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

    is_admin = current_user.role == ADMIN_ROLE
    is_self = current_user.id == usuario_id
    if not is_admin and not is_self:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Permisos insuficientes"
        )

    new_username = _normalize_identifier(usuario_in.username)
    new_email = _normalize_identifier(usuario_in.email)
    if (
        new_username
        and new_username != usuario.username
        and db.query(Usuario).filter(func.lower(Usuario.username) == new_username).first()
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="El nombre de usuario ya existe"
        )
    if (
        new_email
        and new_email != usuario.email
        and db.query(Usuario).filter(func.lower(Usuario.email) == new_email).first()
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="El email ya está registrado"
        )

    update_data = usuario_in.model_dump(exclude_unset=True, exclude={"project_assignments"})
    if not is_admin:
        for field in _SELF_UPDATE_PRIVILEGED_FIELDS:
            update_data.pop(field, None)
    if "username" in update_data:
        update_data["username"] = new_username
    if "email" in update_data:
        update_data["email"] = new_email
    for field, value in update_data.items():
        setattr(usuario, field, value)

    if is_admin and usuario_in.project_assignments is not None:
        _apply_assignments(db, usuario.id, usuario_in.project_assignments)

    db.commit()
    db.refresh(usuario)
    incr(COUNTER_USER_WRITES)
    logger.info("action=user.update actor=%s target=%s", current_user.id, usuario.id)
    return _serialize_user(db, usuario, viewer=current_user)


@router.post("/{usuario_id}/restablecer-contrasena")
async def resetear_password(
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

    from app.core.time import utcnow

    temp_password = generate_temp_password()
    usuario.hashed_password = hash_password(temp_password)
    usuario.must_change_password = True
    usuario.password_changed_at = utcnow()
    db.commit()
    incr(COUNTER_USER_WRITES)
    logger.info(
        "action=user.reset_password actor=%s target=%s",
        current_user.id,
        usuario.id,
    )

    return {
        "message": "Contraseña reseteada exitosamente",
        "temp_password": temp_password
    }


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
