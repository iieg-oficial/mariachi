import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import (
    get_current_user,
    get_db,
    has_permission,
    require_permission,
    verify_csrf,
)
from app.models.project import Project, UserProject
from app.models.sieej import Grupo, usuario_grupo
from app.models.user import Usuario
from app.schemas.user import (
    UsuarioCreate,
    UsuarioResponse,
    UsuarioUpdate,
)
from app.services.actividad_service import registrar_actividad

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/usuarios", tags=["usuarios"])

_require_create = require_permission("mariachi.usuarios.create")
_require_delete = require_permission("mariachi.usuarios.delete")

_UNUSABLE_PASSWORD = "!minerva"

_SELF_UPDATE_PRIVILEGED_FIELDS = frozenset({"role", "username", "must_change_password"})


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
    manages = viewer is not None and has_permission(viewer, "mariachi.usuarios.update")
    is_self = viewer is not None and viewer.id == user.id
    show_full = manages or is_self

    email = user.email if show_full else _mask_email(user.email)
    projects = _user_memberships(db, user.id) if show_full else []

    sieej_grupo = None
    if user.role == "externo":
        grupo = (
            db.query(Grupo)
            .join(usuario_grupo, usuario_grupo.c.grupo_id == Grupo.id)
            .filter(usuario_grupo.c.usuario_id == user.id)
            .order_by(Grupo.nombre.asc())
            .first()
        )
        if grupo is not None:
            sieej_grupo = {"id": grupo.id, "nombre": grupo.nombre}

    return {
        "id": user.id,
        "username": user.username,
        "email": email,
        "name": user.name,
        "role": user.role,
        "must_change_password": user.must_change_password,
        "created_at": user.created_at,
        "projects": projects,
        "sieej_grupo": sieej_grupo,
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


def _set_sieej_grupo(
    db: Session, usuario: Usuario, grupo_id: int | None, grupo_nombre: str | None
) -> None:
    grupo = None
    if grupo_id is not None:
        grupo = db.query(Grupo).filter(Grupo.id == grupo_id).first()
        if grupo is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Grupo no encontrado"
            )
    elif grupo_nombre and grupo_nombre.strip():
        nombre = grupo_nombre.strip()
        grupo = db.query(Grupo).filter(func.lower(Grupo.nombre) == nombre.lower()).first()
        if grupo is None:
            grupo = Grupo(nombre=nombre)
            db.add(grupo)
            db.flush()

    db.execute(usuario_grupo.delete().where(usuario_grupo.c.usuario_id == usuario.id))
    if grupo is not None:
        db.execute(
            usuario_grupo.insert().values(usuario_id=usuario.id, grupo_id=grupo.id)
        )


@router.get("", response_model=list[UsuarioResponse])
async def listar_usuarios(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: Usuario = Depends(get_current_user),
):
    usuarios = db.query(Usuario).offset(skip).limit(limit).all()
    return [_serialize_user(db, u, viewer=current_user) for u in usuarios]


@router.get("/check-usuario/{username}")
async def check_username(
    username: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    normalized = _normalize_identifier(username)
    if not normalized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="nombre de usuario vacío"
        )
    exists = (
        db.query(Usuario).filter(func.lower(Usuario.username) == normalized).first()
    )
    return {"available": exists is None, "username": normalized}


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
    current_user: Usuario = Depends(_require_create),
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

    usuario_data = usuario_in.model_dump(
        exclude={"password", "project_assignments", "sieej_grupo_id", "sieej_grupo_nombre"}
    )
    usuario_data["username"] = username
    usuario_data["email"] = email
    usuario_data["hashed_password"] = _UNUSABLE_PASSWORD
    usuario_data["must_change_password"] = False

    nuevo_usuario = Usuario(**usuario_data)
    db.add(nuevo_usuario)
    db.flush()

    _apply_assignments(db, nuevo_usuario.id, usuario_in.project_assignments)

    if nuevo_usuario.role == "externo":
        _set_sieej_grupo(
            db, nuevo_usuario, usuario_in.sieej_grupo_id, usuario_in.sieej_grupo_nombre
        )

    registrar_actividad(
        db,
        actor=current_user,
        action="user.create",
        resource_type="usuario",
        resource_id=nuevo_usuario.id,
        metadata={"role": nuevo_usuario.role, "username": nuevo_usuario.username},
    )
    db.commit()
    db.refresh(nuevo_usuario)
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

    is_admin = has_permission(current_user, "mariachi.usuarios.update")
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

    update_data = usuario_in.model_dump(
        exclude_unset=True,
        exclude={"project_assignments", "sieej_grupo_id", "sieej_grupo_nombre"},
    )
    if not is_admin:
        for field in _SELF_UPDATE_PRIVILEGED_FIELDS:
            update_data.pop(field, None)
    if "username" in update_data:
        update_data["username"] = new_username
    if "email" in update_data:
        update_data["email"] = new_email
    for field, value in update_data.items():
        setattr(usuario, field, value)

    if usuario_in.project_assignments is not None:
        if not has_permission(current_user, "mariachi.usuarios.assign"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Requiere permiso: mariachi.usuarios.assign",
            )
        _apply_assignments(db, usuario.id, usuario_in.project_assignments)

    grupo_fields = usuario_in.model_fields_set & {"sieej_grupo_id", "sieej_grupo_nombre"}
    if is_admin and usuario.role == "externo" and grupo_fields:
        _set_sieej_grupo(
            db, usuario, usuario_in.sieej_grupo_id, usuario_in.sieej_grupo_nombre
        )

    registrar_actividad(
        db,
        actor=current_user,
        action="user.update",
        resource_type="usuario",
        resource_id=usuario.id,
        metadata={"fields": sorted(update_data.keys())},
    )
    db.commit()
    db.refresh(usuario)
    logger.info("action=user.update actor=%s target=%s", current_user.id, usuario.id)
    return _serialize_user(db, usuario, viewer=current_user)


@router.delete("/{usuario_id}")
async def eliminar_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
    current_user: Usuario = Depends(_require_delete),
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

    target_id = usuario.id
    target_username = usuario.username
    registrar_actividad(
        db,
        actor=current_user,
        action="user.delete",
        resource_type="usuario",
        resource_id=target_id,
        metadata={"username": target_username},
    )
    db.delete(usuario)
    db.commit()
    logger.info("action=user.delete actor=%s target=%s", current_user.id, target_id)
    return {"message": "Usuario eliminado exitosamente"}
