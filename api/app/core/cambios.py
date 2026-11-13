import asyncio
import json
import logging
import time
from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager

import redis.asyncio as aredis

from .cache import redis_client
from .settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

CANAL = "mariachi:cambios"
PING_SEGUNDOS = 25
DURACION_MAXIMA_SEGUNDOS = 600
REINTENTO_MS = 3000
COLA_MAXIMA = 200


def publicar(evento: dict) -> None:
    try:
        redis_client.publish(CANAL, json.dumps({**evento, "ts": time.time()}))
    except Exception as exc:
        logger.debug("cambios: no se pudo publicar %s: %s", evento.get("tipo"), exc)


class _Difusor:
    def __init__(self) -> None:
        self._colas: set[asyncio.Queue[dict]] = set()
        self._tarea: asyncio.Task | None = None

    def _repartir(self, crudo: str) -> None:
        try:
            evento = json.loads(crudo)
        except (TypeError, ValueError):
            return
        for cola in list(self._colas):
            if not cola.full():
                cola.put_nowait(evento)

    async def _escuchar(self) -> None:
        while self._colas:
            try:
                async with aredis.from_url(settings.redis_url, decode_responses=True) as cliente:
                    async with cliente.pubsub() as pubsub:
                        await pubsub.subscribe(CANAL)
                        while self._colas:
                            mensaje = await pubsub.get_message(
                                ignore_subscribe_messages=True, timeout=PING_SEGUNDOS
                            )
                            if mensaje and mensaje.get("type") == "message":
                                self._repartir(mensaje["data"])
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.warning("cambios: suscripcion caida, reintento en 5 s: %s", exc)
                await asyncio.sleep(5)

    @asynccontextmanager
    async def suscribir(self) -> AsyncIterator[asyncio.Queue[dict]]:
        cola: asyncio.Queue[dict] = asyncio.Queue(maxsize=COLA_MAXIMA)
        self._colas.add(cola)
        if self._tarea is None or self._tarea.done():
            self._tarea = asyncio.create_task(self._escuchar())
        try:
            yield cola
        finally:
            self._colas.discard(cola)


difusor = _Difusor()


def _sse(evento: dict) -> str:
    return f"data: {json.dumps(evento, ensure_ascii=False)}\n\n"


async def flujo(
    puede_ver: Callable[[dict], bool],
    desconectado: Callable[[], object],
) -> AsyncIterator[str]:
    inicio = time.monotonic()
    yield f"retry: {REINTENTO_MS}\n\n"
    async with difusor.suscribir() as cola:
        while time.monotonic() - inicio < DURACION_MAXIMA_SEGUNDOS:
            if await desconectado():
                return
            try:
                evento = await asyncio.wait_for(cola.get(), timeout=PING_SEGUNDOS)
            except asyncio.TimeoutError:
                yield ": ping\n\n"
                continue
            if puede_ver(evento):
                yield _sse({k: v for k, v in evento.items() if k != "permisos"})
