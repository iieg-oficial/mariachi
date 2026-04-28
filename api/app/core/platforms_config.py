"""Lista de plataformas del ecosistema IIEG que se exponen en `/sistema/plataformas`.

Cada plataforma tiene un `probe` que define cómo se chequea su estado:
- `self`        → versión leída del `pyproject.toml` local (sin red).
- `ontoy`       → GET al endpoint propio del proyecto (mariachi convention).
- `http_health` → GET HTTP cualquiera; 200 = healthy. La versión queda en None.
- `dataengine`  → conexión SQL a DataEngine + `SELECT version()`.

Plataformas externas que aún no exponen un endpoint conocido se marcan
`probe="http_health"` apuntando a una URL de su propio repo (acervo MinIO,
sieej landing, etc.).
"""

from typing import Literal, TypedDict

Probe = Literal["self", "ontoy", "http_health", "dataengine"]


class PlatformConfig(TypedDict):
    slug: str
    label: str
    url: str | None
    probe: Probe
    probe_url_template: str | None


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
        "slug": "acervo",
        "label": "Acervo (MinIO)",
        "url": None,
        "probe": "http_health",
        "probe_url_template": "{acervo_scheme}://{acervo_endpoint}/minio/health/live",
    },
    {
        "slug": "dataengine",
        "label": "DataEngine",
        "url": None,
        "probe": "dataengine",
        "probe_url_template": None,
    },
    {
        "slug": "sieej",
        "label": "SIEEJ",
        "url": "/sieej",
        "probe": "http_health",
        "probe_url_template": "{sieej_url}",
    },
]
