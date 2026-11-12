from __future__ import annotations

import csv
import io
import re
import time
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor

import httpx
from sqlalchemy.orm import Session, joinedload

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
COLUMNAS_TABLA = (
    'capa', 'nombre_capa_geoserver', 'campo', 'unidades', 'paleta', 'tipo', 'numero_clases',
    'severidad', 'severidad_2', 'orientacion_favorable', 'cortes_rangos', 'nombre_estilo', 'colores',
)
ESTADOS_ACTIVOS = ('en_progreso', 'pendiente_revision', 'rechazado')
ESTADO_LOTE = 'pendiente_revision'
HILOS = 6
CACHE_SEGUNDOS = 120.0
LIMITE_HISTORIAL = 200

_cache: dict[tuple, tuple[float, object]] = {}


class LoteConErroresError(TablaInvalidaError):
    def __init__(self, filas: list[FilaLote]):
        super().__init__('Hay filas con errores')
        self.filas = filas


def revisar(texto: str, dataengine_db: Session, client: GeoServerClient | None = None) -> list[FilaLote]:
    paletas = paletas_por_nombre(load_palettes())
    filas = [interpretar_fila(i + 2, fila, paletas) for i, fila in enumerate(leer_tabla(texto))]
    aliases = {w.geoserver_workspace: w.alias for w in dataengine_db.query(Workspace).all()}
    consultar = _consultar_sin_cache if client else _consultar_con_cache
    cliente = client or GeoServerClient()
    _nombrar_estilos(filas)
    with ThreadPoolExecutor(max_workers=HILOS) as pool:
        list(pool.map(lambda f: _verificar_en_geoserver(f, aliases, cliente, consultar), filas))
    _marcar_repetidas(filas)
    return filas


def _consultar_sin_cache(_clave: tuple, funcion: Callable[[], object]) -> object:
    return funcion()


def _consultar_con_cache(clave: tuple, funcion: Callable[[], object]) -> object:
    ahora = time.monotonic()
    guardado = _cache.get(clave)
    if guardado and ahora - guardado[0] < CACHE_SEGUNDOS:
        return guardado[1]
    valor = funcion()
    _cache[clave] = (ahora, valor)
    return valor


def _nombrar_estilos(filas: list[FilaLote]) -> None:
    vistas: set[tuple[str, str]] = set()
    for fila in filas:
        clave = (fila.workspace, fila.layer_name)
        if not all(clave):
            continue
        if fila.estilo:
            if fila.estilo == fila.layer_name:
                vistas.add(clave)
        elif clave in vistas:
            fila.estilo_calculado = f'{fila.layer_name}_{re.sub(r"[^A-Za-z0-9_-]", "_", fila.attribute)}'
        else:
            vistas.add(clave)
        fila.predeterminado = fila.style_name == fila.layer_name


def _verificar_en_geoserver(
    fila: FilaLote, aliases: dict[str, str], client: GeoServerClient, consultar: Callable,
) -> None:
    if not fila.workspace or not fila.layer_name:
        return
    fila.alias = aliases.get(fila.workspace)
    if fila.alias is None:
        fila.errores.append(f'El workspace «{fila.workspace}» no está conectado al catálogo')
        return
    try:
        listado = consultar(
            ('campos', fila.workspace, fila.layer_name),
            lambda: client.list_fields(fila.workspace, fila.layer_name),
        )
        campos = {c['name']: c['type'] for c in listado}
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
        fila.reemplaza = consultar(
            ('estilo', fila.workspace, fila.style_name),
            lambda: client.style_exists(fila.workspace, fila.style_name),
        )
    except (GeoServerError, httpx.HTTPError):
        fila.errores.append('No se pudo consultar el estilo actual')


def _marcar_repetidas(filas: list[FilaLote]) -> None:
    vistas: dict[tuple[str, str], int] = {}
    for fila in filas:
        clave = (fila.workspace, fila.style_name)
        if not all(clave):
            continue
        if clave in vistas:
            fila.errores.append(f'El estilo «{fila.style_name}» ya viene en la fila {vistas[clave]}')
        else:
            vistas[clave] = fila.fila


def crear_borradores(
    texto: str,
    db: Session,
    dataengine_db: Session,
    usuario: Usuario,
    client: GeoServerClient | None = None,
    reemplazar: list[int] | None = None,
) -> list[Borrador]:
    reemplazar = reemplazar or []
    filas = revisar(texto, dataengine_db, client)
    if any(f.errores for f in filas):
        raise LoteConErroresError(filas)
    borradores = [_guardar(db, fila, usuario) for fila in filas]
    db.flush()
    _quitar_reemplazados(db, set(reemplazar) - {b.id for b in borradores})
    db.commit()
    for borrador in borradores:
        db.refresh(borrador)
    return borradores


def _guardar(db: Session, fila: FilaLote, usuario: Usuario) -> Borrador:
    return guardar_borrador(db, fila.resource_id, fila.borrador_data(), usuario)


def guardar_borrador(db: Session, resource_id: str, data: dict, usuario: Usuario) -> Borrador:
    borrador = (
        db.query(Borrador)
        .filter(
            Borrador.resource_type == 'sld',
            Borrador.resource_id == resource_id,
            Borrador.usuario_id == usuario.id,
            Borrador.estado.in_(ESTADOS_ACTIVOS),
        )
        .first()
    )
    if borrador is None:
        borrador = Borrador(
            resource_type='sld', resource_id=resource_id, usuario_id=usuario.id, data=data, estado=ESTADO_LOTE,
        )
        db.add(borrador)
        return borrador
    borrador.data = data
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
    workspace: str, layer: str, fila: dict | None, width: int, client: GeoServerClient | None = None, sld: str | None = None,
) -> bytes:
    cliente = client or GeoServerClient()
    return cliente.render_map(workspace, layer, sld or (sld_de_fila(fila) if fila else None), width)


def _del_lote(borradores: list[Borrador]) -> list[Borrador]:
    return [b for b in borradores if (b.data or {}).get('origen') == 'lote']


def borradores_sin_publicar(db: Session) -> list[Borrador]:
    return _del_lote(
        db.query(Borrador)
        .options(joinedload(Borrador.usuario))
        .filter(Borrador.resource_type == 'sld', Borrador.estado.in_(ESTADOS_ACTIVOS))
        .order_by(Borrador.actualizado_en.desc())
        .all()
    )


def historial(db: Session) -> list[Borrador]:
    return _del_lote(
        db.query(Borrador)
        .options(joinedload(Borrador.usuario))
        .filter(Borrador.resource_type == 'sld', Borrador.estado == 'aprobado')
        .order_by(Borrador.actualizado_en.desc())
        .limit(LIMITE_HISTORIAL * 5)
        .all()
    )[:LIMITE_HISTORIAL]


def _activos_del_lote(db: Session, ids: set[int] | list[int]) -> list[Borrador]:
    if not ids:
        return []
    return _del_lote(
        db.query(Borrador)
        .filter(Borrador.id.in_(ids), Borrador.resource_type == 'sld', Borrador.estado.in_(ESTADOS_ACTIVOS))
        .order_by(Borrador.id)
        .all()
    )


def _quitar_reemplazados(db: Session, ids: set[int]) -> None:
    for borrador in _activos_del_lote(db, ids):
        db.delete(borrador)


def _numero(valor: float | int) -> str:
    numero = float(valor)
    return str(int(numero)) if numero.is_integer() else str(valor)


def _cortes_texto(cortes: list) -> str:
    return '[' + ', '.join('null' if c is None else _numero(c) for c in cortes) + ']'


def _fila_reconstruida(borrador: Borrador, workspaces: dict[str, str]) -> dict[str, str]:
    data = borrador.data or {}
    alias, _, estilo = borrador.resource_id.partition(':')
    return {
        'capa': data.get('style_title') or estilo,
        'nombre_capa_geoserver': f"{workspaces.get(alias, alias)}:{data.get('layer_name', '')}",
        'campo': data.get('attribute', ''),
        'unidades': (data.get('style_abstract') or '').removeprefix('Unidades: '),
        'paleta': '',
        'orientacion_favorable': '',
        'cortes_rangos': _cortes_texto(data.get('cortes') or []),
        'nombre_estilo': estilo,
        'colores': ' '.join(data.get('colors') or []),
    }


def _fila_para_editar(borrador: Borrador, workspaces: dict[str, str]) -> dict[str, str]:
    tabla = (borrador.data or {}).get('tabla')
    if not tabla:
        return _fila_reconstruida(borrador, workspaces)
    return {**tabla, 'nombre_estilo': tabla.get('nombre_estilo') or borrador.resource_id.partition(':')[2]}


def tabla_de_borradores(ids: list[int], db: Session, dataengine_db: Session) -> str:
    borradores = [b for b in _activos_del_lote(db, ids) if (b.data or {}).get('shape') != 'xml']
    if not borradores:
        raise TablaInvalidaError('No hay borradores sin publicar para editar')
    workspaces = {w.alias: w.geoserver_workspace for w in dataengine_db.query(Workspace).all()}
    return tabla_de_filas([_fila_para_editar(b, workspaces) for b in borradores])


def tabla_de_filas(filas: list[dict[str, str]]) -> str:
    salida = io.StringIO()
    escritor = csv.DictWriter(salida, fieldnames=COLUMNAS_TABLA, extrasaction='ignore', lineterminator='\n')
    escritor.writeheader()
    escritor.writerows(filas)
    return salida.getvalue()

