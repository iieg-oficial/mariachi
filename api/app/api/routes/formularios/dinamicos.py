"""Endpoints respondent de la plataforma de formularios dinamicos.

Coexiste con el wizard SIEEJ original (rutas `general`, `enlaces`,
`bases-datos`, `catalogos`). Las rutas literales del wizard tienen
precedencia sobre las dinamicas porque se incluyen primero en
`formularios/__init__.py`.
"""
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, verify_csrf
from app.core.database import get_db
from app.models.user import Usuario
from app.schemas.sieej.envio import (
    EnvioResponse,
    EnvioUpdate,
    EnvioUploadResponse,
    MisEnviosDetalle,
    MisEnviosListResponse,
)
from app.schemas.sieej.formulario import FormularioDetalle, FormularioListItem
from app.services.sieej.definicion_validator import definicion_to_validation_rules
from app.services.sieej.envios_service import EnviosService
from app.services.sieej.formularios_dinamicos_service import (
    FormulariosDinamicosService,
)

router = APIRouter()


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


@router.get("/mis-envios", response_model=MisEnviosListResponse)
async def listar_mis_envios(
    estado: str | None = Query(default=None, pattern=r"^(en_proceso|enviado|expirado)$"),
    q: str | None = Query(default=None, max_length=128),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort: str = Query(default="-actualizado_en", pattern=r"^(-actualizado_en|-enviado_en|nombre)$"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Listado paginado de los envios del usuario autenticado."""
    items, total = EnviosService(db).listar_mis_envios(
        current_user,
        estado=estado,
        q=q,
        page=page,
        page_size=page_size,
        sort=sort,
    )
    return MisEnviosListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[
            {
                "id": e.id,
                "estado": e.estado,
                "paso_actual": e.paso_actual,
                "iniciado_en": e.iniciado_en,
                "enviado_en": e.enviado_en,
                "actualizado_en": e.actualizado_en,
                "formulario": {
                    "slug": e.formulario.slug,
                    "nombre": e.formulario.nombre,
                    "descripcion": e.formulario.descripcion,
                },
            }
            for e in items
        ],
    )


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
        envio=EnvioResponse.model_validate(envio) if envio else None,
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
    definicion = envio.definicion_snapshot if envio else formulario.definicion
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
    return EnvioResponse.model_validate(envio)


@router.put("/{slug}/envio", response_model=EnvioResponse)
async def actualizar_envio(
    slug: str,
    body: EnvioUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    formulario = FormulariosDinamicosService(db).get_by_slug_visible(slug, current_user)
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
    )
    return EnvioResponse.model_validate(envio)


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
