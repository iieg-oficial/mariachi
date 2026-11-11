from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor

import httpx
from sqlalchemy.orm import Session

from app.core.time import utcnow
from app.models.borrador import Borrador
from app.models.layer import Workspace
from app.models.user import Usuario
from app.services.estilos_lote_tabla import (
    DEFAULT_NULL_STYLE,
    DEFAULT_STROKE,
    FilaLote,
    TablaInvalidaError,
    interpretar_fila,
    leer_tabla,
    paletas_por_nombre,
)
from app.services.geoserver_client import GeoServerClient, GeoServerError
from app.services.palette_service import load_palettes
from app.services.sld_generator import build_sld_xml

TIPOS_NUMERICOS = {'integer', 'number'}
ESTADOS_ACTIVOS = ('en_progreso', 'pendiente_revision', 'rechazado')
ESTADO_LOTE = 'pendiente_revision'
HILOS = 6


class LoteConErroresError(TablaInvalidaError):
    def __init__(self, filas: list[FilaLote]):
        super().__init__('Hay filas con errores')
        self.filas = filas


def revisar(texto: str, dataengine_db: Session, client: GeoServerClient | None = None) -> list[FilaLote]:
    paletas = paletas_por_nombre(load_palettes())
    filas = [interpretar_fila(i + 2, fila, paletas) for i, fila in enumerate(leer_tabla(texto))]
    aliases = {w.geoserver_workspace: w.alias for w in dataengine_db.query(Workspace).all()}
    cliente = client or GeoServerClient()
    with ThreadPoolExecutor(max_workers=HILOS) as pool:
        list(pool.map(lambda f: _verificar_en_geoserver(f, aliases, cliente), filas))
    _marcar_repetidas(filas)
    return filas


def _verificar_en_geoserver(fila: FilaLote, aliases: dict[str, str], client: GeoServerClient) -> None:
    if not fila.workspace or not fila.layer_name:
        return
    fila.alias = aliases.get(fila.workspace)
    if fila.alias is None:
        fila.errores.append(f'El workspace «{fila.workspace}» no está conectado al catálogo')
        return
    try:
        campos = {c['name']: c['type'] for c in client.list_fields(fila.workspace, fila.layer_name)}
    except (GeoServerError, httpx.HTTPError):
        fila.errores.append('La capa no existe en GeoServer')
        return
    if fila.attribute:
        tipo = campos.get(fila.attribute)
        if tipo is None:
            fila.errores.append(f'La capa no tiene el campo «{fila.attribute}»')
        elif tipo not in TIPOS_NUMERICOS:
            fila.errores.append(f'El campo «{fila.attribute}» no es numérico')
    try:
        fila.reemplaza = client.style_exists(fila.workspace, fila.style_name)
    except (GeoServerError, httpx.HTTPError):
        fila.errores.append('No se pudo consultar el estilo actual')


def _marcar_repetidas(filas: list[FilaLote]) -> None:
    vistas: dict[tuple[str, str], int] = {}
    for fila in filas:
        clave = (fila.workspace, fila.layer_name)
        if not all(clave):
            continue
        if clave in vistas:
            fila.errores.append(f'La capa ya viene en la fila {vistas[clave]}')
        else:
            vistas[clave] = fila.fila


def crear_borradores(
    texto: str,
    db: Session,
    dataengine_db: Session,
    usuario: Usuario,
    client: GeoServerClient | None = None,
) -> list[Borrador]:
    filas = revisar(texto, dataengine_db, client)
    if any(f.errores for f in filas):
        raise LoteConErroresError(filas)
    borradores = [_guardar(db, fila, usuario) for fila in filas]
    db.commit()
    for borrador in borradores:
        db.refresh(borrador)
    return borradores


def _guardar(db: Session, fila: FilaLote, usuario: Usuario) -> Borrador:
    borrador = (
        db.query(Borrador)
        .filter(
            Borrador.resource_type == 'sld',
            Borrador.resource_id == fila.resource_id,
            Borrador.usuario_id == usuario.id,
            Borrador.estado.in_(ESTADOS_ACTIVOS),
        )
        .first()
    )
    if borrador is None:
        borrador = Borrador(
            resource_type='sld',
            resource_id=fila.resource_id,
            usuario_id=usuario.id,
            data=fila.borrador_data(),
            estado=ESTADO_LOTE,
        )
        db.add(borrador)
        return borrador
    borrador.data = fila.borrador_data()
    borrador.estado = ESTADO_LOTE
    borrador.comentario_rechazo = None
    borrador.actualizado_en = utcnow()
    return borrador


def sld_de_fila(fila: dict) -> str:
    return build_sld_xml(
        layer_name=fila['layer_name'],
        style_title=fila.get('nombre') or fila['layer_name'],
        style_abstract='',
        attribute=fila['attribute'],
        cortes=fila['cortes'],
        labels=fila['labels'],
        colors=fila['colores'],
        stroke=dict(DEFAULT_STROKE),
        null_style=dict(DEFAULT_NULL_STYLE),
    )


def vista_previa(
    workspace: str, layer: str, fila: dict | None, width: int, client: GeoServerClient | None = None,
) -> bytes:
    cliente = client or GeoServerClient()
    return cliente.render_map(workspace, layer, sld_de_fila(fila) if fila else None, width)
