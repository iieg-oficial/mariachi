from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permission, verify_csrf
from app.models.user import Usuario
from app.schemas.vine import (
    CatalogoIn,
    CatalogoRow,
    FichaDetalle,
    FichaIn,
    IncidenciaIn,
    IncidenciaListaRow,
    IncidenciaMasivaIn,
    IncidenciaRow,
    PersonalRow,
    PersonasResponse,
    ResumenResponse,
    RitmoResponse,
)
from app.services import (
    vine_catalogos,
    vine_ficha,
    vine_incidencias,
    vine_perfiles,
    vine_stats,
)
from app.services.vine_sync import VineSyncError, sincronizar

router = APIRouter(prefix="/vine", tags=["vine"])

PERMISO_PERSONAS = "mariachi.vine_personas.view"
PERMISO_EDITAR = "mariachi.vine_personas.update"


@router.get("/estadisticas/resumen", response_model=ResumenResponse)
async def resumen(
    dias: int = Query(30, ge=1, le=1095),
    db: Session = Depends(get_db),
):
    return {
        "panorama": vine_stats.panorama(db, dias),
        "calidad": vine_stats.calidad(db, dias),
        "medios": vine_stats.comparativa_medios(db, dias),
        "vinculos": vine_perfiles.por_vinculo(db, dias),
        "horarios": vine_perfiles.apego_horario(db, max(dias, 90)),
        "sincronizacion": vine_stats.sincronizacion(db),
    }


@router.get("/estadisticas/ritmo", response_model=RitmoResponse)
async def ritmo(
    dias: int = Query(30, ge=1, le=1095),
    meses: int = Query(36, ge=1, le=120),
    db: Session = Depends(get_db),
):
    return {
        "horario": vine_stats.ritmo_horario(db, dias),
        "semanal": vine_stats.ritmo_semanal(db, min(dias * 12, 1095)),
        "tendencia": vine_stats.tendencia_mensual(db, meses),
        "puntos": vine_stats.uso_por_punto(db, dias),
    }


@router.get(
    "/estadisticas/personas",
    response_model=PersonasResponse,
    dependencies=[Depends(require_permission(PERMISO_PERSONAS))],
)
async def personas(
    dias: int = Query(30, ge=1, le=1095),
    limite: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    return {
        "horas": vine_stats.ranking_horas(db, dias, limite),
        "madrugadores": vine_stats.madrugadores(db, dias, limite),
        "rachas": vine_stats.rachas(db, max(dias, 90), limite),
        "incompletos": vine_stats.registro_incompleto(db, dias, limite),
    }


@router.get(
    "/personal",
    response_model=list[PersonalRow],
    dependencies=[Depends(require_permission(PERMISO_PERSONAS))],
)
async def personal(
    dias: int = Query(90, ge=1, le=1095),
    incluir_bajas: bool = Query(False),
    db: Session = Depends(get_db),
):
    return vine_perfiles.personal(db, dias, incluir_bajas)


@router.get(
    "/personal/{pin}",
    response_model=FichaDetalle,
    dependencies=[Depends(require_permission(PERMISO_PERSONAS))],
)
async def detalle_persona(pin: str, db: Session = Depends(get_db)):
    bio = vine_ficha.biometrico(db, pin)
    if bio is None:
        raise HTTPException(status_code=404, detail="esa persona no esta en el biometrico")
    return {"pin": pin, "biometrico": bio, "ficha": vine_ficha.ficha(db, pin)}


@router.patch(
    "/personal/{pin}",
    dependencies=[Depends(require_permission(PERMISO_EDITAR))],
)
async def editar_persona(
    pin: str,
    datos: FichaIn,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(verify_csrf),
):
    if vine_ficha.biometrico(db, pin) is None:
        raise HTTPException(status_code=404, detail="esa persona no esta en el biometrico")
    autor = getattr(usuario, "email", None) or getattr(usuario, "username", None)
    return vine_ficha.guardar(db, pin, datos.model_dump(exclude_unset=True), autor)


@router.get(
    "/personal/{pin}/asistencia",
    dependencies=[Depends(require_permission(PERMISO_PERSONAS))],
)
async def asistencia_persona(
    pin: str,
    dias: int = Query(90, ge=7, le=1095),
    db: Session = Depends(get_db),
):
    return vine_perfiles.asistencia_persona(db, pin, dias)


@router.get(
    "/personal/{pin}/incidencias",
    response_model=list[IncidenciaRow],
    dependencies=[Depends(require_permission(PERMISO_PERSONAS))],
)
async def listar_incidencias(pin: str, db: Session = Depends(get_db)):
    return vine_incidencias.listar(db, pin)


@router.post(
    "/personal/{pin}/incidencias",
    response_model=IncidenciaRow,
    dependencies=[Depends(require_permission(PERMISO_EDITAR))],
)
async def crear_incidencia(
    pin: str,
    datos: IncidenciaIn,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(verify_csrf),
):
    if vine_ficha.biometrico(db, pin) is None:
        raise HTTPException(status_code=404, detail="esa persona no esta en el biometrico")
    autor = getattr(usuario, "email", None) or getattr(usuario, "username", None)
    try:
        vine_incidencias.crear(db, pin, datos.desde, datos.hasta, datos.tipo, datos.nota, autor)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return vine_incidencias.listar(db, pin)[0]


@router.delete(
    "/personal/{pin}/incidencias/{incidencia_id}",
    dependencies=[Depends(require_permission(PERMISO_EDITAR))],
)
async def borrar_incidencia(
    pin: str,
    incidencia_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(verify_csrf),
):
    if not vine_incidencias.borrar(db, incidencia_id):
        raise HTTPException(status_code=404, detail="esa incidencia no existe")
    return {"borrada": incidencia_id}


@router.get(
    "/incidencias",
    response_model=list[IncidenciaListaRow],
    dependencies=[Depends(require_permission(PERMISO_PERSONAS))],
)
async def listado_incidencias(
    desde: date | None = Query(None),
    hasta: date | None = Query(None),
    tipo: str | None = Query(None),
    db: Session = Depends(get_db),
):
    return vine_incidencias.listado(db, desde, hasta, tipo)


@router.post(
    "/incidencias",
    dependencies=[Depends(require_permission(PERMISO_EDITAR))],
)
async def crear_incidencias_masivas(
    datos: IncidenciaMasivaIn,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(verify_csrf),
):
    autor = getattr(usuario, "email", None) or getattr(usuario, "username", None)
    try:
        creadas = vine_incidencias.crear_masiva(
            db, datos.pins, datos.desde, datos.hasta, datos.tipo, datos.nota, autor
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"creadas": creadas}


@router.get("/incidencias/tipos")
async def tipos_incidencia(db: Session = Depends(get_db)):
    return list(vine_incidencias.tipos(db).values())


@router.get("/catalogos", response_model=list[CatalogoRow])
async def listar_catalogos(
    tipo: str | None = Query(None),
    solo_activos: bool = Query(False),
    db: Session = Depends(get_db),
):
    return vine_catalogos.listar(db, tipo, solo_activos)


@router.post(
    "/catalogos/{tipo}",
    response_model=CatalogoRow,
    dependencies=[Depends(require_permission(PERMISO_EDITAR))],
)
async def crear_catalogo(
    tipo: str,
    datos: CatalogoIn,
    db: Session = Depends(get_db),
    _: Usuario = Depends(verify_csrf),
):
    try:
        return vine_catalogos.crear(db, tipo, datos.model_dump(exclude_unset=True))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.patch(
    "/catalogos/{catalogo_id}",
    response_model=CatalogoRow,
    dependencies=[Depends(require_permission(PERMISO_EDITAR))],
)
async def actualizar_catalogo(
    catalogo_id: int,
    datos: CatalogoIn,
    db: Session = Depends(get_db),
    _: Usuario = Depends(verify_csrf),
):
    fila = vine_catalogos.actualizar(db, catalogo_id, datos.model_dump(exclude_unset=True))
    if fila is None:
        raise HTTPException(status_code=404, detail="ese elemento del catalogo no existe")
    return fila


@router.delete(
    "/catalogos/{catalogo_id}",
    dependencies=[Depends(require_permission(PERMISO_EDITAR))],
)
async def borrar_catalogo(
    catalogo_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(verify_csrf),
):
    if not vine_catalogos.borrar(db, catalogo_id):
        raise HTTPException(status_code=404, detail="ese elemento del catalogo no existe")
    return {"borrado": catalogo_id}


@router.post("/sincronizar")
async def sincronizar_biometrico(
    db: Session = Depends(get_db),
    _: Usuario = Depends(verify_csrf),
):
    try:
        return sincronizar(db)
    except VineSyncError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
