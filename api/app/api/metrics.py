from __future__ import annotations

import threading
from collections import defaultdict

from fastapi import APIRouter, Response

_counters: dict[str, int] = defaultdict(int)
_lock = threading.Lock()

COUNTER_RATE_LIMIT_HITS = 'mariachi_rate_limit_hits_total'
COUNTER_TREE_NOTIFY = 'mariachi_tree_notify_total'
COUNTER_TREE_NOTIFY_FAILED = 'mariachi_tree_notify_failed_total'
COUNTER_GEOSERVER_CALLS = 'mariachi_geoserver_calls_total'
COUNTER_LAYER_WRITES = 'mariachi_layer_writes_total'
COUNTER_LAYER_READS = 'mariachi_layer_reads_total'
COUNTER_PROJECT_WRITES = 'mariachi_project_writes_total'
COUNTER_USER_WRITES = 'mariachi_user_writes_total'
COUNTER_MEDIA_BUCKET_WRITES = 'mariachi_media_bucket_writes_total'
COUNTER_MEDIA_UPLOADS = 'mariachi_media_uploads_total'
COUNTER_MEDIA_DELETES = 'mariachi_media_deletes_total'
COUNTER_LAYER_METADATA_WRITES = 'mariachi_layer_metadata_writes_total'
COUNTER_EVENTO_WRITES = 'mariachi_evento_writes_total'
COUNTER_EVENTO_PUBLISH = 'mariachi_evento_publish_total'
COUNTER_HOME_WRITES = 'mariachi_home_writes_total'
COUNTER_MAPALAB_SHARE_WRITES = 'mariachi_mapalab_share_writes_total'
COUNTER_SIEEJ_FORMULARIO_WRITES = 'mariachi_sieej_formulario_writes_total'
COUNTER_SIEEJ_ENVIO_WRITES = 'mariachi_sieej_envio_writes_total'
COUNTER_SIEEJ_ENVIO_EXPIRED = 'mariachi_sieej_envio_expired_total'
COUNTER_SIEEJ_ENVIO_REABIERTO = 'mariachi_sieej_envio_reabierto_total'
COUNTER_LOGIN_SUCCESS = 'mariachi_login_success_total'
COUNTER_LOGIN_FAILED = 'mariachi_login_failed_total'
COUNTER_LOGIN_LOCKED = 'mariachi_login_locked_total'


def incr(name: str, amount: int = 1) -> None:
    with _lock:
        _counters[name] += amount


def _render_prometheus() -> str:
    lines: list[str] = []
    for name, value in sorted(_counters.items()):
        lines.append(f'# TYPE {name} counter')
        lines.append(f'{name} {value}')
    return '\n'.join(lines) + '\n'


router = APIRouter(tags=['metrics'])


@router.get('/metrics', include_in_schema=False)
async def metrics() -> Response:
    return Response(content=_render_prometheus(), media_type='text/plain; version=0.0.4')
