from __future__ import annotations

import time
from concurrent.futures import ThreadPoolExecutor

import httpx

from app.services.geoserver_client import GeoServerClient, GeoServerError
from app.services.sld_parser import parse_sld

TTL_SEGUNDOS = 120
HILOS = 8

_cache: dict[str, tuple[float, dict[str, dict]]] = {}


def _estilos_por_capa(client: GeoServerClient, workspace: str) -> dict[str, list[str]]:
    capas = client.list_layers(workspace)

    def estilos_de(capa: str) -> list[str]:
        try:
            return client.list_styles(workspace, capa)
        except (httpx.HTTPError, GeoServerError):
            return []

    usos: dict[str, list[str]] = {}
    with ThreadPoolExecutor(max_workers=HILOS) as pool:
        for capa, estilos in zip(capas, pool.map(estilos_de, capas)):
            for estilo in estilos:
                usos.setdefault(estilo.removeprefix(f'{workspace}:'), []).append(capa)
    return usos


def _ficha(client: GeoServerClient, workspace: str, estilo: str) -> dict:
    try:
        parsed = parse_sld(client.get_sld(workspace, estilo))
    except (httpx.HTTPError, GeoServerError):
        return {'shape': None, 'editable': False, 'reason': 'No se pudo leer el SLD'}
    return {'shape': parsed.shape, 'editable': parsed.editable, 'reason': parsed.reason}


def resumen_estilos(workspace: str, client: GeoServerClient | None = None, fresco: bool = False) -> dict[str, dict]:
    guardado = _cache.get(workspace)
    if guardado and not fresco and time.monotonic() - guardado[0] < TTL_SEGUNDOS:
        return guardado[1]
    cliente = client or GeoServerClient()
    estilos = cliente.list_workspace_styles(workspace)
    usos = _estilos_por_capa(cliente, workspace)
    with ThreadPoolExecutor(max_workers=HILOS) as pool:
        fichas = list(pool.map(lambda nombre: _ficha(cliente, workspace, nombre), estilos))
    resumen = {
        nombre: {**ficha, 'sharedBy': usos.get(nombre, [])}
        for nombre, ficha in zip(estilos, fichas)
    }
    _cache[workspace] = (time.monotonic(), resumen)
    return resumen
