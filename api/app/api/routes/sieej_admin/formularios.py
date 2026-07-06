from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, verify_csrf
from app.core.database import get_db
from app.models.user import Usuario
from app.schemas.sieej.envio import EnvioResponse
from app.schemas.sieej.formulario import (
    FormularioCreate,
    FormularioResponse,
    FormularioUpdate,
)
from app.schemas.sieej.grupo import FormularioAsignacionesUpdate
from app.services.sieej.formularios_admin_service import FormulariosAdminService

router = APIRouter()


@router.get("/formularios", response_model=list[FormularioResponse])
async def listar_formularios(
    estado: str | None = Query(default=None, pattern=r"^(borrador|activo|cerrado)$"),
    slug: str | None = None,
    db: Session = Depends(get_db),
):
    return FormulariosAdminService(db).listar(estado=estado, slug=slug)


@router.post(
    "/formularios",
    response_model=FormularioResponse,
    status_code=status.HTTP_201_CREATED,
)
async def crear_formulario(
    data: FormularioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    return FormulariosAdminService(db).crear(data.model_dump(), current_user)


@router.get("/formularios/{formulario_id}", response_model=FormularioResponse)
async def obtener_formulario(
    formulario_id: int,
    db: Session = Depends(get_db),
):
    return FormulariosAdminService(db).get(formulario_id)


@router.put("/formularios/{formulario_id}", response_model=FormularioResponse)
async def actualizar_formulario(
    formulario_id: int,
    data: FormularioUpdate,
    db: Session = Depends(get_db),
    actor: Usuario = Depends(verify_csrf),
):
    return FormulariosAdminService(db).actualizar(
        formulario_id, data.model_dump(exclude_unset=True), actor=actor
    )


@router.post("/formularios/{formulario_id}/publicar", response_model=FormularioResponse)
async def publicar_formulario(
    formulario_id: int,
    db: Session = Depends(get_db),
    actor: Usuario = Depends(verify_csrf),
):
    return FormulariosAdminService(db).publicar(formulario_id, actor=actor)


@router.post("/formularios/{formulario_id}/cerrar", response_model=FormularioResponse)
async def cerrar_formulario(
    formulario_id: int,
    db: Session = Depends(get_db),
    actor: Usuario = Depends(verify_csrf),
):
    return FormulariosAdminService(db).cerrar(formulario_id, actor=actor)


@router.delete("/formularios/{formulario_id}")
async def eliminar_formulario(
    formulario_id: int,
    db: Session = Depends(get_db),
    actor: Usuario = Depends(verify_csrf),
):
    """Borra el formulario si no tiene envios; si tiene, lo cierra
    (preserva datos historicos)."""
    resultado = FormulariosAdminService(db).eliminar(formulario_id, actor=actor)
    if resultado is None:
        return {"message": "Formulario eliminado"}
    return {
        "message": "Formulario tiene envios; fue cerrado en vez de eliminado",
        "formulario": FormularioResponse.model_validate(resultado).model_dump(mode="json"),
    }


@router.put(
    "/formularios/{formulario_id}/asignaciones",
    response_model=FormularioResponse,
)
async def actualizar_asignaciones(
    formulario_id: int,
    data: FormularioAsignacionesUpdate,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
):
    return FormulariosAdminService(db).actualizar_asignaciones(
        formulario_id, data.grupos, data.usuarios
    )


@router.get("/formularios/{formulario_id}/envios")
async def listar_envios(
    formulario_id: int,
    estado: str | None = Query(default=None, pattern=r"^(en_proceso|enviado|expirado)$"),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
    _user: Usuario = Depends(get_current_user),
):
    items, total = FormulariosAdminService(db).listar_envios(
        formulario_id, estado=estado, offset=offset, limit=limit
    )
    usuario_ids = {e.usuario_id for e in items if e.usuario_id is not None}
    usuarios = (
        {u.id: u for u in db.query(Usuario).filter(Usuario.id.in_(usuario_ids)).all()}
        if usuario_ids
        else {}
    )
    serializados = []
    for e in items:
        u = usuarios.get(e.usuario_id)
        serializados.append(
            EnvioResponse.model_validate(e)
            .model_copy(
                update={
                    "usuario_nombre": u.name if u else None,
                    "usuario_email": u.email if u else None,
                }
            )
            .model_dump(mode="json")
        )
    return {"total": total, "items": serializados}


@router.get(
    "/formularios/{formulario_id}/envios/{envio_id}",
    response_model=EnvioResponse,
)
async def obtener_envio(
    formulario_id: int,
    envio_id: int,
    db: Session = Depends(get_db),
):
    return FormulariosAdminService(db).get_envio(formulario_id, envio_id)


@router.post(
    "/formularios/{formulario_id}/envios/{envio_id}/reabrir",
    response_model=EnvioResponse,
)
async def reabrir_envio(
    formulario_id: int,
    envio_id: int,
    db: Session = Depends(get_db),
    actor: Usuario = Depends(verify_csrf),
):
    return FormulariosAdminService(db).reabrir_envio(formulario_id, envio_id, actor)


@router.post("/sieej/expirar-envios-pendientes")
async def expirar_envios_pendientes(
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
):
    """Bulk-expire de envios en_proceso de formularios fuera de vigencia.

    Idempotente: correr varias veces no afecta envios ya en estado expirado.
    Pensado para ejecutarse desde un cron externo o manual desde el admin
    cuando se detecten envios "huerfanos" tras un cierre de vigencia.
    """
    from app.services.sieej.envios_service import EnviosService
    afectados = EnviosService(db).expirar_pendientes_bulk()
    return {"expirados": afectados}
