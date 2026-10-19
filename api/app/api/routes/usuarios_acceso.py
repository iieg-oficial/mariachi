import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permission, verify_csrf
from app.models.user import Usuario
from app.schemas.usuario_acceso import (
    AccesoResponse,
    AccesoUpdate,
    EnlaceAcceso,
    PersonaMinerva,
    RolMinerva,
)
from app.services import minerva_admin
from app.services.actividad_service import registrar_actividad

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/usuarios", tags=["usuarios"])

PERMISO_ACCESO = "mariachi.access.manage"
_require_acceso = require_permission(PERMISO_ACCESO)
_NOMBRE_MINIMO = 6


def _persona(data: dict, usuario_id: int | None) -> PersonaMinerva:
    return PersonaMinerva(
        minerva_id=data["id"],
        email=data["email"],
        status=data["status"],
        roles=data.get("roles", []),
        usuario_id=usuario_id,
    )


def _usuario(db: Session, usuario_id: int) -> Usuario:
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return usuario


def _nombre_para_minerva(usuario: Usuario) -> str:
    nombre = (usuario.name or "").strip()
    if len(nombre) >= _NOMBRE_MINIMO:
        return nombre
    return f"{nombre} ({usuario.email})".strip()[:255]


def _vincular(db: Session, usuario: Usuario, minerva_id: str) -> None:
    if usuario.minerva_sub == minerva_id:
        return
    otro = db.query(Usuario).filter(Usuario.minerva_sub == minerva_id).first()
    if otro is not None and otro.id != usuario.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"La cuenta de minerva ya está vinculada a {otro.username}",
        )
    usuario.minerva_sub = minerva_id


@router.get("/acceso/roles", response_model=list[RolMinerva])
async def listar_roles(current_user: Usuario = Depends(_require_acceso)):
    return await minerva_admin.listar_roles(current_user.minerva_access_token)


@router.get("/acceso/personas", response_model=list[PersonaMinerva])
async def listar_personas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(_require_acceso),
):
    personas = await minerva_admin.listar_personas(current_user.minerva_access_token)
    subs = [p["id"] for p in personas]
    locales = dict(
        db.query(Usuario.minerva_sub, Usuario.id).filter(Usuario.minerva_sub.in_(subs)).all()
    )
    return [_persona(p, locales.get(p["id"])) for p in personas]


@router.put("/{usuario_id}/acceso", response_model=AccesoResponse)
async def fijar_acceso(
    usuario_id: int,
    data: AccesoUpdate,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
    current_user: Usuario = Depends(_require_acceso),
):
    usuario = _usuario(db, usuario_id)
    token = current_user.minerva_access_token
    enlace = None
    minerva_id = usuario.minerva_sub
    if minerva_id is None:
        existente = await minerva_admin.buscar_por_correo(token, usuario.email)
        if existente is None and not data.role_ids:
            return AccesoResponse()
        if existente is None:
            alta = await minerva_admin.dar_de_alta(
                token, usuario.email, _nombre_para_minerva(usuario), data.role_ids
            )
            minerva_id = alta["id"]
            enlace = alta.get("credential_link")
        else:
            minerva_id = existente["id"]
        _vincular(db, usuario, minerva_id)

    persona = await minerva_admin.fijar_roles(token, minerva_id, data.role_ids)
    registrar_actividad(
        db,
        actor=current_user,
        action="user.access",
        resource_type="usuario",
        resource_id=usuario.id,
        metadata={"role_ids": data.role_ids, "alta": enlace is not None},
    )
    db.commit()
    logger.info("action=user.access actor=%s target=%s", current_user.id, usuario.id)
    return AccesoResponse(
        persona=_persona(persona, usuario.id),
        enlace=EnlaceAcceso(**enlace) if enlace else None,
    )


@router.post("/{usuario_id}/acceso/enlace", response_model=EnlaceAcceso)
async def emitir_enlace(
    usuario_id: int,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
    current_user: Usuario = Depends(_require_acceso),
):
    usuario = _usuario(db, usuario_id)
    if usuario.minerva_sub is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La persona todavía no tiene acceso en minerva",
        )
    enlace = await minerva_admin.emitir_enlace(
        current_user.minerva_access_token, usuario.minerva_sub
    )
    registrar_actividad(
        db,
        actor=current_user,
        action="user.access_link",
        resource_type="usuario",
        resource_id=usuario.id,
        metadata={"purpose": enlace.get("purpose")},
    )
    db.commit()
    return EnlaceAcceso(**enlace)
