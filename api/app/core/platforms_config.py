"""Lista de plataformas del ecosistema IIEG que se exponen en `/sistema/plataformas`.

Cada plataforma tiene un `probe` que define cómo se chequea su estado:
- `self`        → versión leída del `pyproject.toml` local (sin red).
- `ontoy`       → GET al endpoint `/ontoy` del proyecto. Espera JSON con `version`.
                  Convención del ecosistema IIEG.
- `http_health` → GET HTTP cualquiera; 200 = healthy. La versión queda en None.
- `dataengine`  → conexión SQL a DataEngine + `SELECT version()` (versión de Postgres).
- `none`        → no hay probe; siempre healthy. Útil cuando un servicio aún no expone
                  endpoint y solo queremos mostrar su `static_version`.

Cada plataforma puede tener `static_version` con la versión del **repositorio**
(la del CHANGELOG). Cuando está presente, se devuelve siempre — aún si el probe
no responde — para que el dashboard muestre la versión del repo aunque el
servicio esté caído. El `healthy` siempre viene del probe.

IMPORTANTE: al bumpear el CHANGELOG de un repo del ecosistema, sincronizar el
`static_version` aquí. (TODO: pre-commit hook que lo verifique.) La versión del
endpoint `/ontoy` también debería coincidir, pero la del CHANGELOG manda.
"""

from typing import Literal, TypedDict

Probe = Literal["self", "ontoy", "http_health", "dataengine", "none"]


class PlatformConfig(TypedDict, total=False):
    slug: str
    label: str
    url: str | None
    probe: Probe
    probe_url_template: str | None
    static_version: str | None


PLATFORMS: list[PlatformConfig] = [
    {
        "slug": "mariachi",
        "label": "Mariachi",
        "url": "/inicio",
        "probe": "self",
        "probe_url_template": None,
    },
    {
        "slug": "mapalab",
        "label": "MapaLab",
        "url": "/mapa",
        "probe": "ontoy",
        "probe_url_template": "{mapalab_backend_url}/ontoy",
    },
    {
        "slug": "mapalab-dataengine",
        "label": "DataEngine",
        "url": None,
        "probe": "ontoy",
        "probe_url_template": "{dataengine_ontoy_url}",
        "static_version": "1.12.0",
    },
    {
        "slug": "acervo",
        "label": "Acervo",
        "url": None,
        "probe": "ontoy",
        "probe_url_template": "{acervo_ontoy_url}",
        "static_version": "1.18.0",
    },
    {
        "slug": "gateway-hub",
        "label": "Gateway Hub",
        "url": None,
        "probe": "ontoy",
        "probe_url_template": "{gateway_hub_ontoy_url}",
        "static_version": "1.24.1",
    },
    {
        "slug": "huachicol",
        "label": "Huachicol",
        "url": None,
        "probe": "ontoy",
        "probe_url_template": "{huachicol_ontoy_url}",
        "static_version": "1.16.1",
    },
    {
        "slug": "geoserver",
        "label": "GeoServer",
        "url": None,
        "probe": "ontoy",
        "probe_url_template": "{geoserver_ontoy_url}",
        "static_version": "1.14.1",
    },
    {
        "slug": "sieej",
        "label": "SIEEJ",
        "url": "/sieej",
        "probe": "ontoy",
        "probe_url_template": "{sieej_ontoy_url}",
    },
]
