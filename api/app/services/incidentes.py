from __future__ import annotations

import hashlib
import hmac
import logging
import time
from collections import defaultdict
from typing import Any

from fastapi import Request

from app.core.cache import redis_client
from app.core.settings import get_settings

logger = logging.getLogger(__name__)

STREAM = 'mariachi:incidentes'
MAXLEN = 5000
LIMITE_LECTURA = 5000
VENTANA_MAX_MINUTOS = 24 * 60
_CAMPO_MAX = 160


def _recortar(valor: str | None) -> str:
    return (valor or '')[:_CAMPO_MAX]


def huella_ip(ip: str | None) -> str:
    if not ip:
        return 'ip:desconocida'
    clave = get_settings().secret_key.encode('utf-8')
    digest = hmac.new(clave, ip.encode('utf-8'), hashlib.sha256).hexdigest()
    return f'ip:{digest[:12]}'


def plantilla_de_ruta(request: Request | None) -> str:
    if request is None:
        return ''
    route = request.scope.get('route')
    plantilla = getattr(route, 'path', None)
    return plantilla or ''


def registrar_incidente(
    *,
    tipo: str,
    scope: str,
    actor: str,
    metodo: str,
    ruta: str,
    golpes: int,
    limite: int,
    ventana_s: int,
) -> None:
    campos = {
        'tipo': _recortar(tipo),
        'scope': _recortar(scope) or 'general',
        'actor': _recortar(actor),
        'metodo': _recortar(metodo),
        'ruta': _recortar(ruta),
        'golpes': str(int(golpes)),
        'limite': str(int(limite)),
        'ventana_s': str(int(ventana_s)),
    }
    try:
        redis_client.xadd(STREAM, campos, maxlen=MAXLEN, approximate=True)
    except Exception as exc:
        logger.warning('incidente no registrado: %s', exc)


def _leer_desde(desde_ms: int) -> list[tuple[str, dict[str, str]]]:
    try:
        return redis_client.xrevrange(STREAM, max='+', min=str(desde_ms), count=LIMITE_LECTURA)
    except Exception as exc:
        logger.warning('incidentes no leidos: %s', exc)
        return []


def resumen(minutos: int) -> dict[str, Any]:
    minutos = max(1, min(minutos, VENTANA_MAX_MINUTOS))
    ahora_ms = int(time.time() * 1000)
    entradas = _leer_desde(ahora_ms - minutos * 60 * 1000)

    grupos: dict[tuple[str, str, str, str, str], dict[str, Any]] = {}
    por_minuto: dict[int, int] = defaultdict(int)
    recientes: list[dict[str, Any]] = []

    for entrada_id, campos in entradas:
        ts = int(entrada_id.split('-', 1)[0])
        clave = (
            campos.get('tipo', ''),
            campos.get('scope', ''),
            campos.get('actor', ''),
            campos.get('metodo', ''),
            campos.get('ruta', ''),
        )
        grupo = grupos.get(clave)
        if grupo is None:
            grupo = {
                'tipo': clave[0],
                'scope': clave[1],
                'actor': clave[2],
                'metodo': clave[3],
                'ruta': clave[4],
                'golpes': 0,
                'pico': 0,
                'limite': int(campos.get('limite') or 0) or None,
                'ventana_s': int(campos.get('ventana_s') or 0) or None,
                'serie': defaultdict(int),
                'primero': ts,
                'ultimo': ts,
            }
            grupos[clave] = grupo
        grupo['golpes'] += 1
        grupo['pico'] = max(grupo['pico'], int(campos.get('golpes') or 0))
        grupo['primero'] = min(grupo['primero'], ts)
        grupo['ultimo'] = max(grupo['ultimo'], ts)
        grupo['serie'][ts // 60000 * 60000] += 1
        por_minuto[ts // 60000] += 1
        if len(recientes) < 200:
            recientes.append({'ts': ts, **{k: campos.get(k, '') for k in ('tipo', 'scope', 'actor', 'metodo', 'ruta')}})

    minuto_actual = ahora_ms // 60000
    serie = [
        {'ts': (minuto_actual - i) * 60000, 'golpes': por_minuto.get(minuto_actual - i, 0)}
        for i in range(min(minutos, 120) - 1, -1, -1)
    ]

    for grupo in grupos.values():
        grupo['serie'] = [{'ts': t, 'golpes': n} for t, n in sorted(grupo['serie'].items())]
        grupo['duracion_s'] = (grupo['ultimo'] - grupo['primero']) // 1000

    return {
        'ventana_minutos': minutos,
        'total': len(entradas),
        'truncado': len(entradas) >= LIMITE_LECTURA,
        'grupos': sorted(grupos.values(), key=lambda g: g['golpes'], reverse=True),
        'serie': serie,
        'recientes': recientes,
    }
