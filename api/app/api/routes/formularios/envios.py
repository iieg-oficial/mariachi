"""Rutas del envio del respondent: consulta, captura, sync y archivos.

Se separan de `dinamicos.py` porque el recurso ya no cabe en un archivo. Se
incluyen antes que aquel: sus paths son mas especificos que el `/{slug}` de la
ficha del formulario.
"""
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, verify_csrf
from app.api.rate_limit import rate_limit
from app.core.database import get_db
from app.models.user import Usuario
from app.schemas.sieej.envio import (
    CambioRef,
    EnvioCapturaCampos,
    EnvioCapturaResponse,
    EnvioResponse,
    EnvioSyncRequest,
    EnvioSyncResponse,
    EnvioUpdate,
    EnvioUploadResponse,
)
from app.services.sieej.colaboracion_service import ColaboracionService
from app.services.sieej.envios_service import EnviosService
from app.services.sieej.formularios_dinamicos_service import (
    FormulariosDinamicosService,
)
from app.services.sieej.pertenencia import es_coordinador

router = APIRouter()


def envio_response(
    formulario,
    envio,
    db: Session | None = None,
    user: Usuario | None = None,
) -> EnvioResponse | None:
    """Serializa el envio con el estado de cambios de version y quien puede enviar.

    `db` y `user` solo hacen falta para resolver el coordinador de un envio de
    grupo; sin ellos `puede_enviar` queda en el default y el cliente descubre la
    frontera con el 403 del PUT.
    """
    if envio is None:
        return None
    info = EnviosService.info_cambios(formulario, envio)
    colaborativo = bool(getattr(formulario, "colaborativo", False))
    puede_enviar = True
    if envio.grupo_id is not None and db is not None and user is not None:
        puede_enviar = es_coordinador(db, user.id, envio.grupo_id)
    return EnvioResponse.model_validate(envio).model_copy(
        update={
            "actualizacion_disponible": info["actualizacion_disponible"],
            "cambios_preview": [CambioRef(**c) for c in info["cambios_preview"]],
            "cambios_aplicados": [CambioRef(**c) for c in info["cambios_aplicados"]],
            "colaborativo": colaborativo,
            "puede_enviar": puede_enviar,
        }
    )


@router.get("/{slug}/envio", response_model=EnvioResponse)
async def obtener_envio(
    slug: str,
    grupo_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    formulario = FormulariosDinamicosService(db).get_by_slug_visible(slug, current_user)
    if formulario is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Formulario no encontrado o no asignado",
        )
    envio = EnviosService(db).get_o_iniciar(formulario, current_user, grupo_id=grupo_id)
    return envio_response(formulario, envio, db, current_user)


_sync_rate_limit = rate_limit(
    max_requests=30, window_seconds=60.0, scope="sieej_sync"
)
"""Techo por usuario del polling de captura.

La cadencia del cliente es de 10 s con la pestana visible y 30 s en solitario,
o sea seis por minuto y hasta unas veinte con varias pestanas abiertas. Treinta
deja holgura para el jitter y corta un cliente con un bug de reintento antes de
que se coma la cuota de IP que comparte toda la dependencia tras la NAT.
"""


@router.post("/{slug}/envio/sync", response_model=EnvioSyncResponse)
async def sincronizar_envio(
    slug: str,
    body: EnvioSyncRequest,
    grupo_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
    _rl=Depends(_sync_rate_limit),
):
    """Latido de presencia, delta de campos y quien mas esta viendo el envio."""
    formulario = FormulariosDinamicosService(db).get_by_slug_visible(
        slug, current_user, include_inactive=True
    )
    if formulario is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Formulario no encontrado o no asignado",
        )
    envio = EnviosService(db).get_o_iniciar(
        formulario, current_user, crear_si_falta=False, grupo_id=grupo_id
    )
    if envio is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Envio no encontrado"
        )
    return ColaboracionService(db).sync(
        current_user, envio, body.desde, body.seccion, salir=body.salir
    )


@router.patch("/{slug}/envio/campos", response_model=EnvioCapturaResponse)
async def capturar_campos(
    slug: str,
    body: EnvioCapturaCampos,
    grupo_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    """Merge parcial sobre un envio en proceso, con el delta de vuelta."""
    formulario = FormulariosDinamicosService(db).get_by_slug_visible(
        slug, current_user, include_inactive=True
    )
    if formulario is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Formulario no encontrado o no asignado",
        )
    envio = EnviosService(db).get_o_iniciar(
        formulario, current_user, grupo_id=grupo_id
    )
    return ColaboracionService(db).capturar(
        current_user, envio.id, body.campos, body.desde
    )


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
    return envio_response(formulario, envio, db, current_user)


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
    return envio_response(formulario, envio, db, current_user)


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
