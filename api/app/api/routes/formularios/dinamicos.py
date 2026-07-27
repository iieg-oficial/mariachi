"""Endpoints respondent de la plataforma de formularios dinamicos.

Coexiste con el wizard SIEEJ original (rutas `general`, `enlaces`,
`bases-datos`, `catalogos`). Las rutas literales del wizard tienen
precedencia sobre las dinamicas porque se incluyen primero en
`formularios/__init__.py`.
"""
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, verify_csrf
from app.core.database import get_db
from app.core.time import utcnow
from app.models.user import Usuario
from app.schemas.sieej.envio import (
    CambioRef,
    EnvioActualizarCampos,
    EnvioHistorialItem,
    EnvioResponse,
    EnvioUpdate,
    EnvioUploadResponse,
    MisEnviosDetalle,
)
from app.schemas.sieej.formulario import FormularioDetalle, FormularioListItem
from app.services.sieej.compat import normalizar_definicion
from app.services.sieej.definicion_validator import definicion_to_validation_rules
from app.services.sieej.envios_service import EnviosService
from app.services.sieej.formularios_dinamicos_service import (
    FormulariosDinamicosService,
)
from app.services.sieej.pdf_service import render_envio_pdf

router = APIRouter()


def _envio_response(formulario, envio) -> EnvioResponse | None:
    """Serializa el envio agregando el estado de cambios de version."""
    if envio is None:
        return None
    info = EnviosService.info_cambios(formulario, envio)
    return EnvioResponse.model_validate(envio).model_copy(
        update={
            "actualizacion_disponible": info["actualizacion_disponible"],
            "cambios_preview": [CambioRef(**c) for c in info["cambios_preview"]],
            "cambios_aplicados": [CambioRef(**c) for c in info["cambios_aplicados"]],
        }
    )


@router.get("/", response_model=list[FormularioListItem])
async def listar_formularios(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return FormulariosDinamicosService(db).listar_visibles(current_user)


# ---------------------------------------------------------------------------
# "Mis envios" — IMPORTANTE: estas rutas deben declararse ANTES de /{slug}
# para que FastAPI no las trate como path param.
# ---------------------------------------------------------------------------


@router.get("/mis-envios/{envio_id}", response_model=MisEnviosDetalle)
async def obtener_mi_envio(
    envio_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Detalle de un envio del usuario autenticado.

    - 404 si no existe; 403 si pertenece a otro usuario.
    - Renderea con `definicion_snapshot` (la del momento del envio,
      no la actual del formulario) para fidelidad historica.
    - `archivos` ordenados por subido_en asc; `eventos` por ocurrido_en asc.
    """
    envio = EnviosService(db).obtener_mi_envio_detalle(current_user, envio_id)
    archivos = sorted(envio.archivos, key=lambda a: a.subido_en)
    eventos = sorted(envio.eventos, key=lambda ev: ev.ocurrido_en)
    return MisEnviosDetalle(
        id=envio.id,
        formulario={
            "slug": envio.formulario.slug,
            "nombre": envio.formulario.nombre,
            "descripcion": envio.formulario.descripcion,
        },
        estado=envio.estado,
        paso_actual=envio.paso_actual,
        datos=envio.datos or {},
        definicion_snapshot=envio.definicion_snapshot or {},
        archivos=archivos,
        eventos=eventos,
        iniciado_en=envio.iniciado_en,
        enviado_en=envio.enviado_en,
        expirado_en=envio.expirado_en,
        actualizado_en=envio.actualizado_en,
    )


@router.delete("/mis-envios/{envio_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_mi_envio(
    envio_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    """Soft-delete del envio para el respondent.

    El admin sigue viendo el envio en `/sieej/formularios/{id}/envios` con
    `eliminado_en` poblado (preserva trazabilidad). El respondent ya no lo
    ve en `mis-envios` ni puede pedir el detalle. Idempotente: re-eliminar
    un envio ya eliminado devuelve 404.
    """
    EnviosService(db).eliminar_mi_envio(current_user, envio_id)


@router.get("/mis-envios/{envio_id}/pdf")
async def descargar_mi_envio_pdf(
    envio_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    envio = EnviosService(db).obtener_mi_envio_detalle(current_user, envio_id)
    definicion = envio.definicion_snapshot or {}
    pdf_bytes = render_envio_pdf(definicion, envio.datos or {})

    usuario_nombre = current_user.name or current_user.nombre or f"usuario_{current_user.id}"
    usuario_slug = "".join(
        c if c.isalnum() or c in "-_ " else "" for c in usuario_nombre
    ).strip().replace(" ", "_") or "usuario"
    formulario_slug = "".join(
        c if c.isalnum() or c in "-_ " else ""
        for c in (definicion.get("nombre") or "formulario")
    ).strip().replace(" ", "_") or "formulario"
    fecha_dt = envio.enviado_en or envio.actualizado_en or envio.iniciado_en or utcnow()
    fecha = fecha_dt.strftime("%Y-%m-%d")
    filename = f"{usuario_slug}_{formulario_slug}_{fecha}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}"
        },
    )


@router.put(
    "/mis-envios/{envio_id}/actualizar-campos", response_model=EnvioResponse
)
async def actualizar_campos_mi_envio(
    envio_id: int,
    body: EnvioActualizarCampos,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    """Actualizacion ligera de un envio ya enviado.

    Edita solo los campos marcados `editableAfterSubmit` en el snapshot del
    envio, sin reabrirlo (el estado sigue en `enviado`). Cada cambio de valor
    queda en el historial de auditoria del envio.
    """
    service = EnviosService(db)
    envio = service.actualizar_campos(current_user, envio_id, body.campos)
    return _envio_response(envio.formulario, envio)


@router.get(
    "/mis-envios/{envio_id}/historial",
    response_model=list[EnvioHistorialItem],
)
async def obtener_mi_envio_historial(
    envio_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Historial de cambios de valor de un envio del usuario autenticado."""
    return EnviosService(db).listar_historial_mi_envio(current_user, envio_id)


@router.get("/{slug}", response_model=FormularioDetalle)
async def obtener_formulario(
    slug: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    formulario = FormulariosDinamicosService(db).get_by_slug_visible(slug, current_user)
    if formulario is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Formulario no encontrado o no asignado",
        )
    envio = EnviosService(db).get_o_iniciar(formulario, current_user, crear_si_falta=False)
    periodico = bool(formulario.periodicidad)
    abierto = True
    ventana_apertura = ventana_cierre = proxima_apertura = None
    if periodico:
        from app.core.time import utcnow
        from app.services.sieej.periodos_service import periodo_relevante

        ahora = utcnow()
        _clave, ventana_apertura, ventana_cierre = periodo_relevante(
            formulario.periodicidad, ahora
        )
        abierto = ventana_apertura <= ahora < ventana_cierre
        proxima_apertura = None if abierto else ventana_apertura
    return FormularioDetalle(
        id=formulario.id,
        slug=formulario.slug,
        nombre=formulario.nombre,
        descripcion=formulario.descripcion,
        estado=formulario.estado,
        vigencia_inicio=formulario.vigencia_inicio,
        vigencia_fin=formulario.vigencia_fin,
        version=formulario.version,
        definicion=envio.definicion_snapshot if envio else formulario.definicion,
        envio=_envio_response(formulario, envio),
        periodico=periodico,
        abierto=abierto,
        ventana_apertura=ventana_apertura,
        ventana_cierre=ventana_cierre,
        proxima_apertura=proxima_apertura,
    )


@router.get("/{slug}/schema")
async def obtener_schema(
    slug: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Definicion + reglas de validacion planas para uso del frontend."""
    formulario = FormulariosDinamicosService(db).get_by_slug_visible(slug, current_user)
    if formulario is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Formulario no encontrado o no asignado",
        )
    envio = EnviosService(db).get_o_iniciar(formulario, current_user, crear_si_falta=False)
    definicion = normalizar_definicion(
        envio.definicion_snapshot if envio else formulario.definicion
    )
    return {
        "definicion": definicion,
        "validation_rules": definicion_to_validation_rules(definicion),
    }


@router.get("/{slug}/envio", response_model=EnvioResponse)
async def obtener_envio(
    slug: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    formulario = FormulariosDinamicosService(db).get_by_slug_visible(slug, current_user)
    if formulario is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Formulario no encontrado o no asignado",
        )
    envio = EnviosService(db).get_o_iniciar(formulario, current_user)
    return _envio_response(formulario, envio)


@router.put("/{slug}/envio", response_model=EnvioResponse)
async def actualizar_envio(
    slug: str,
    body: EnvioUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    formulario = FormulariosDinamicosService(db).get_by_slug_visible(
        slug, current_user, include_inactive=True
    )
    if formulario is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Formulario no encontrado o no asignado",
        )
    envio = EnviosService(db).actualizar(
        formulario,
        current_user,
        datos=body.datos,
        paso_actual=body.paso_actual,
        enviar=body.enviar,
        cambios_vistos=body.cambios_vistos,
    )
    return _envio_response(formulario, envio)


@router.post("/{slug}/envio/actualizar-version", response_model=EnvioResponse)
async def actualizar_version_envio(
    slug: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    """Aplica la definicion vigente al envio en proceso del respondent.

    Conserva las respuestas capturadas y persiste el diff en
    `cambios_pendientes` para marcar en el sider/paso/campo que cambio.
    """
    formulario = FormulariosDinamicosService(db).get_by_slug_visible(
        slug, current_user, include_inactive=True
    )
    if formulario is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Formulario no encontrado o no asignado",
        )
    envio = EnviosService(db).actualizar_version(formulario, current_user)
    return _envio_response(formulario, envio)


@router.post("/{slug}/envio/upload", response_model=EnvioUploadResponse)
async def subir_archivo(
    slug: str,
    field_path: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    formulario = FormulariosDinamicosService(db).get_by_slug_visible(slug, current_user)
    if formulario is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Formulario no encontrado o no asignado",
        )
    archivo = await EnviosService(db).upload_archivo(
        formulario, current_user, field_path, file
    )
    return EnvioUploadResponse(
        field_path=archivo.field_path,
        url_publica=archivo.url_publica or "",
        filename_original=archivo.filename_original,
        mime=archivo.mime,
        size_bytes=archivo.size_bytes,
    )
