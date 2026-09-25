from typing import Literal
from urllib.parse import quote

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_permission, verify_csrf
from app.core.database import get_db
from app.models.sieej.envio import EnvioFormulario
from app.models.sieej.formulario import FormularioVersion
from app.models.sieej.periodo import FormularioPeriodo
from app.models.user import Usuario
from app.schemas.sieej.envio import (
    EnvioDetalleResponse,
    EnvioEventoAdminResponse,
    EnvioHistorialAdminItem,
    EnvioResponse,
)
from app.schemas.sieej.formulario import (
    FormularioCreate,
    FormularioResponse,
    FormularioUpdate,
    FormularioUpdateResponse,
    PresenciaEditor,
    PresenciaIn,
    UltimoCambioInfo,
)
from app.schemas.sieej.grupo import FormularioAsignacionesUpdate
from app.services import presence
from app.services.sieej.formularios_admin_service import FormulariosAdminService
from app.services.sieej.pdf_service import render_envio_pdf
from app.services.sieej.xlsx_service import build_envios_csv, build_envios_xlsx

router = APIRouter()

_ver_formularios = [Depends(require_permission("mariachi.sieej_formularios.view"))]
_crear_formularios = [Depends(require_permission("mariachi.sieej_formularios.create"))]
_editar_formularios = [Depends(require_permission("mariachi.sieej_formularios.update"))]
_borrar_formularios = [Depends(require_permission("mariachi.sieej_formularios.delete"))]
_ver_envios = [Depends(require_permission("mariachi.sieej_envios.view"))]
_editar_envios = [Depends(require_permission("mariachi.sieej_envios.update"))]
_exportar_envios = [Depends(require_permission("mariachi.sieej_envios.export"))]

PRESENCE_SCOPE = "sieej_formulario"


def _slug_filename(nombre: str) -> str:
    base = "".join(c if c.isalnum() or c in "-_ " else "" for c in (nombre or "formulario"))
    return base.strip().replace(" ", "_") or "formulario"


def _content_disposition(filename: str) -> str:
    return f"attachment; filename=\"{filename}\"; filename*=UTF-8''{quote(filename)}"


@router.get("/formularios", response_model=list[FormularioResponse], dependencies=_ver_formularios)
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
    dependencies=_crear_formularios,
)
async def crear_formulario(
    data: FormularioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    return FormulariosAdminService(db).crear(data.model_dump(), current_user)


@router.get(
    "/formularios/presencia",
    response_model=dict[str, list[PresenciaEditor]],
    dependencies=_ver_formularios,
)
async def presencia_de_todos_los_formularios(
    current_user: Usuario = Depends(get_current_user),
):
    """Quien esta editando cada formulario, para marcarlo en el listado."""
    return presence.list_by_resource(PRESENCE_SCOPE, current_user.username)


@router.put("/formularios/{formulario_id}/presencia", dependencies=_ver_formularios)
async def registrar_presencia_formulario(
    formulario_id: int,
    data: PresenciaIn,
    current_user: Usuario = Depends(verify_csrf),
):
    presence.register(
        PRESENCE_SCOPE,
        formulario_id,
        current_user.username,
        current_user.name,
        avatar_url=current_user.avatar_url,
        seccion=data.seccion,
    )
    return {"ok": True}


@router.delete("/formularios/{formulario_id}/presencia", dependencies=_ver_formularios)
async def salir_de_formulario(
    formulario_id: int,
    current_user: Usuario = Depends(verify_csrf),
):
    presence.unregister(PRESENCE_SCOPE, formulario_id, current_user.username)
    return {"ok": True}


@router.get(
    "/formularios/{formulario_id}/presencia",
    response_model=list[PresenciaEditor],
    dependencies=_ver_formularios,
)
async def obtener_presencia_formulario(
    formulario_id: int,
    current_user: Usuario = Depends(get_current_user),
):
    return presence.list_others(PRESENCE_SCOPE, formulario_id, current_user.username)


@router.get("/formularios/{formulario_id_or_slug}", response_model=FormularioResponse, dependencies=_ver_formularios)
async def obtener_formulario(
    formulario_id_or_slug: str,
    db: Session = Depends(get_db),
):
    return FormulariosAdminService(db).get_by_id_or_slug(formulario_id_or_slug)


@router.put("/formularios/{formulario_id}", response_model=FormularioUpdateResponse, dependencies=_editar_formularios)
async def actualizar_formulario(
    formulario_id: int,
    data: FormularioUpdate,
    db: Session = Depends(get_db),
    actor: Usuario = Depends(verify_csrf),
):
    formulario, cambio = FormulariosAdminService(db).actualizar(
        formulario_id, data.model_dump(exclude_unset=True), actor=actor
    )
    return FormularioUpdateResponse.model_validate(formulario).model_copy(
        update={
            "ultimo_cambio": (
                UltimoCambioInfo.model_validate(cambio) if cambio else None
            )
        }
    )


@router.post("/formularios/{formulario_id}/publicar", response_model=FormularioResponse, dependencies=_editar_formularios)
async def publicar_formulario(
    formulario_id: int,
    db: Session = Depends(get_db),
    actor: Usuario = Depends(verify_csrf),
):
    return FormulariosAdminService(db).publicar(formulario_id, actor=actor)


@router.post("/formularios/{formulario_id}/cerrar", response_model=FormularioResponse, dependencies=_editar_formularios)
async def cerrar_formulario(
    formulario_id: int,
    db: Session = Depends(get_db),
    actor: Usuario = Depends(verify_csrf),
):
    return FormulariosAdminService(db).cerrar(formulario_id, actor=actor)


@router.post("/formularios/{formulario_id}/reabrir", response_model=FormularioResponse, dependencies=_editar_formularios)
async def reabrir_formulario(
    formulario_id: int,
    db: Session = Depends(get_db),
    actor: Usuario = Depends(verify_csrf),
):
    """`cerrado` -> `activo`, limpiando la vigencia que lo dejaria invisible."""
    return FormulariosAdminService(db).reabrir(formulario_id, actor=actor)


@router.delete("/formularios/{formulario_id}", dependencies=_borrar_formularios)
async def eliminar_formulario(
    formulario_id: int,
    confirmacion: str | None = Query(
        default=None,
        description=(
            "Nombre exacto del formulario. Solo el admin global puede mandarlo, "
            "y hace que un formulario con envios se borre de verdad —con sus "
            "respuestas y sus archivos del Acervo— en vez de cerrarse."
        ),
    ),
    db: Session = Depends(get_db),
    actor: Usuario = Depends(verify_csrf),
):
    """Borra el formulario si no tiene envios; si tiene, lo cierra
    (preserva datos historicos) salvo que llegue `confirmacion`."""
    resultado = FormulariosAdminService(db).eliminar(
        formulario_id, actor=actor, confirmacion=confirmacion
    )
    if resultado is None:
        return {"message": "Formulario eliminado"}
    return {
        "message": "Formulario tiene envios; fue cerrado en vez de eliminado",
        "formulario": FormularioResponse.model_validate(resultado).model_dump(mode="json"),
    }


@router.put(
    "/formularios/{formulario_id}/asignaciones",
    response_model=FormularioResponse,
    dependencies=_editar_formularios,
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


@router.get("/formularios/{formulario_id}/envios", dependencies=_ver_envios)
async def listar_envios(
    formulario_id: int,
    estado: str | None = Query(default=None, pattern=r"^(en_proceso|enviado|expirado)$"),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
    _user: Usuario = Depends(get_current_user),
):
    service = FormulariosAdminService(db)
    formulario = service.get(formulario_id)
    items, total = service.listar_envios(
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
    return {
        "total": total,
        "items": serializados,
        "version_actual": formulario.version,
        "desactualizados": service.contar_desactualizados(
            formulario_id, formulario.version
        ),
    }


@router.get(
    "/formularios/{formulario_id}/envios/{envio_id}",
    response_model=EnvioDetalleResponse,
    dependencies=_ver_envios,
)
async def obtener_envio(
    formulario_id: int,
    envio_id: int,
    db: Session = Depends(get_db),
):
    envio = FormulariosAdminService(db).get_envio(formulario_id, envio_id)
    usuario = (
        db.query(Usuario).filter(Usuario.id == envio.usuario_id).first()
        if envio.usuario_id
        else None
    )
    return EnvioDetalleResponse.model_validate(envio).model_copy(
        update={
            "usuario_nombre": usuario.name if usuario else None,
            "usuario_email": usuario.email if usuario else None,
        }
    )


@router.get("/formularios/{formulario_id}/envios/{envio_id}/pdf", dependencies=_ver_envios)
async def descargar_envio_pdf(
    formulario_id: int,
    envio_id: int,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(get_current_user),
):
    envio = FormulariosAdminService(db).get_envio(formulario_id, envio_id)
    definicion = envio.definicion_snapshot or {}
    pdf_bytes = render_envio_pdf(definicion, envio.datos or {})
    usuario = (
        db.query(Usuario).filter(Usuario.id == envio.usuario_id).first()
        if envio.usuario_id
        else None
    )
    usuario_slug = _slug_filename(
        usuario.name if usuario and usuario.name else f"usuario_{envio.usuario_id or envio.id}"
    )
    formulario_slug = _slug_filename(definicion.get("nombre") or "formulario")
    fecha_dt = envio.enviado_en or envio.actualizado_en or envio.iniciado_en
    fecha = fecha_dt.strftime("%Y-%m-%d") if fecha_dt else "sin_fecha"
    filename = f"{usuario_slug}_{formulario_slug}_{fecha}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": _content_disposition(filename)},
    )


@router.get(
    "/formularios/{formulario_id}/envios/{envio_id}/historial",
    response_model=list[EnvioHistorialAdminItem],
    dependencies=_ver_envios,
)
async def obtener_envio_historial(
    formulario_id: int,
    envio_id: int,
    db: Session = Depends(get_db),
):
    service = FormulariosAdminService(db)
    items = service.listar_historial_envio(formulario_id, envio_id)
    actor_ids = {h.actor_usuario_id for h in items if h.actor_usuario_id}
    actores = (
        {u.id: u for u in db.query(Usuario).filter(Usuario.id.in_(actor_ids)).all()}
        if actor_ids
        else {}
    )
    return [
        EnvioHistorialAdminItem.model_validate(h).model_copy(
            update={
                "actor_nombre": (
                    actores[h.actor_usuario_id].name
                    if h.actor_usuario_id in actores
                    else None
                ),
                "actor_email": (
                    actores[h.actor_usuario_id].email
                    if h.actor_usuario_id in actores
                    else None
                ),
            }
        )
        for h in items
    ]


@router.get(
    "/formularios/{formulario_id}/envios/{envio_id}/eventos",
    response_model=list[EnvioEventoAdminResponse],
    dependencies=_ver_envios,
)
async def obtener_envio_eventos(
    formulario_id: int,
    envio_id: int,
    db: Session = Depends(get_db),
):
    """Linea de tiempo del envio con el actor de cada evento resuelto."""
    return FormulariosAdminService(db).listar_eventos_envio(formulario_id, envio_id)


@router.get("/formularios/{formulario_id}/exportar-envios", dependencies=_exportar_envios)
async def exportar_envios(
    formulario_id: int,
    formato: Literal["xlsx", "csv"] = Query("xlsx"),
    db: Session = Depends(get_db),
    _user: Usuario = Depends(get_current_user),
):
    formulario = FormulariosAdminService(db).get(formulario_id)
    envios = (
        db.query(EnvioFormulario)
        .filter(
            EnvioFormulario.formulario_id == formulario_id,
            EnvioFormulario.eliminado_en.is_(None),
        )
        .order_by(EnvioFormulario.id)
        .all()
    )
    usuario_ids = {e.usuario_id for e in envios if e.usuario_id is not None}
    usuarios = (
        {u.id: u for u in db.query(Usuario).filter(Usuario.id.in_(usuario_ids)).all()}
        if usuario_ids
        else {}
    )
    historial_filas, capturistas = FormulariosAdminService(db).historial_export(
        formulario_id, envios, usuarios
    )
    filas = []
    for e in envios:
        u = usuarios.get(e.usuario_id)
        filas.append(
            {
                "id": e.id,
                "usuario_nombre": u.name if u else None,
                "usuario_email": u.email if u else None,
                "capturado_por": capturistas.get(e.id, ""),
                "estado": e.estado,
                "formulario_version": e.formulario_version,
                "enviado_en": e.enviado_en.strftime("%Y-%m-%d %H:%M") if e.enviado_en else "",
                "datos": e.datos or {},
                "definicion": e.definicion_snapshot or formulario.definicion or {},
            }
        )
    historicas = [
        fv.definicion
        for fv in db.query(FormularioVersion)
        .filter(FormularioVersion.formulario_id == formulario_id)
        .order_by(FormularioVersion.version)
        .all()
    ]
    nombre = _slug_filename(formulario.nombre)
    if formato == "csv":
        contenido, es_zip = build_envios_csv(
            filas,
            definiciones_historicas=historicas,
            definicion_vigente=formulario.definicion,
            historial=historial_filas,
        )
        filename = f"{nombre}_envios.{'zip' if es_zip else 'csv'}"
        return Response(
            content=contenido,
            media_type="application/zip" if es_zip else "text/csv; charset=utf-8",
            headers={"Content-Disposition": _content_disposition(filename)},
        )
    xlsx_bytes = build_envios_xlsx(
        filas,
        definiciones_historicas=historicas,
        definicion_vigente=formulario.definicion,
        historial=historial_filas,
    )
    filename = f"{nombre}_envios.xlsx"
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": _content_disposition(filename)},
    )


@router.post(
    "/formularios/{formulario_id}/envios/{envio_id}/reabrir",
    response_model=EnvioResponse,
    dependencies=_editar_envios,
)
async def reabrir_envio(
    formulario_id: int,
    envio_id: int,
    db: Session = Depends(get_db),
    actor: Usuario = Depends(verify_csrf),
):
    return FormulariosAdminService(db).reabrir_envio(formulario_id, envio_id, actor)


@router.delete("/formularios/{formulario_id}/envios/{envio_id}", dependencies=_borrar_formularios)
async def eliminar_envio(
    formulario_id: int,
    envio_id: int,
    confirmacion: str = Query(
        description=(
            "Nombre (o usuario) de la dependencia que envio. Solo el admin "
            "global; borra el envio con sus respuestas, archivos e historial."
        ),
    ),
    db: Session = Depends(get_db),
    actor: Usuario = Depends(verify_csrf),
):
    archivos = FormulariosAdminService(db).eliminar_envio(
        formulario_id, envio_id, actor=actor, confirmacion=confirmacion
    )
    return {"message": "Envio eliminado", "archivos_borrados": archivos}


@router.post("/sieej/expirar-envios-pendientes", dependencies=_editar_envios)
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


@router.get("/formularios/{formulario_id}/periodos", dependencies=_ver_formularios)
async def listar_periodos(
    formulario_id: int,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(get_current_user),
):
    """Ventanas materializadas de un formulario periodico (recientes primero)."""
    FormulariosAdminService(db).get(formulario_id)
    periodos = (
        db.query(FormularioPeriodo)
        .filter(FormularioPeriodo.formulario_id == formulario_id)
        .order_by(FormularioPeriodo.apertura.desc())
        .all()
    )
    return [
        {
            "id": p.id,
            "clave": p.clave,
            "apertura": p.apertura,
            "cierre": p.cierre,
            "estado": p.estado,
            "notificado_apertura_en": p.notificado_apertura_en,
            "notificado_faltantes_en": p.notificado_faltantes_en,
        }
        for p in periodos
    ]


@router.get("/formularios/{formulario_id}/notificaciones", dependencies=_ver_envios)
async def listar_notificaciones(
    formulario_id: int,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(get_current_user),
):
    """Bitacora de comunicaciones (avisos de apertura y de faltantes)."""
    from app.services.sieej.notificaciones_service import NotificacionesService

    FormulariosAdminService(db).get(formulario_id)
    return [
        {
            "id": n.id,
            "tipo": n.tipo,
            "periodo_clave": (n.payload or {}).get("clave"),
            "resumen": n.resumen,
            "payload": n.payload,
            "destinatarios": n.destinatarios,
            "enviado_en": n.enviado_en,
        }
        for n in NotificacionesService(db).listar(formulario_id)
    ]


@router.get("/formularios/{formulario_id}/notificaciones/exportar", dependencies=_exportar_envios)
async def exportar_notificaciones(
    formulario_id: int,
    formato: Literal["xlsx", "csv"] = Query("xlsx"),
    db: Session = Depends(get_db),
    _user: Usuario = Depends(get_current_user),
):
    """Descarga la bitacora de comunicaciones en CSV o XLSX."""
    from app.services.sieej.notificaciones_service import NotificacionesService

    formulario = FormulariosAdminService(db).get(formulario_id)
    contenido, media_type, ext = NotificacionesService(db).exportar(
        formulario_id, formato
    )
    filename = f"{_slug_filename(formulario.nombre)}_comunicaciones.{ext}"
    return Response(
        content=contenido,
        media_type=media_type,
        headers={"Content-Disposition": _content_disposition(filename)},
    )


@router.post("/sieej/periodos/tick", dependencies=_editar_formularios)
async def periodos_tick(
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
):
    """Abre/cierra ventanas periodicas, expira envios y dispara avisos.

    Idempotente: lo invoca el cron (`scripts/sieej_periodos_tick.py`) y tambien
    sirve para dispararlo manualmente desde el admin (util en dev, que no corre
    el cron)."""
    from app.services.sieej.periodos_service import PeriodosService

    return PeriodosService(db).tick()
