"""Endpoints respondent de la plataforma de formularios dinamicos.

Coexiste con el wizard SIEEJ original (rutas `general`, `enlaces`,
`bases-datos`, `catalogos`). Las rutas literales del wizard tienen
precedencia sobre las dinamicas porque se incluyen primero en
`formularios/__init__.py`.
"""
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, verify_csrf
from app.core.database import get_db
from app.models.user import Usuario
from app.schemas.sieej.envio import (
    EnvioResponse,
    EnvioUpdate,
    EnvioUploadResponse,
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
