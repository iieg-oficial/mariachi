"""Lista de plataformas del ecosistema IIEG que se exponen en `/sistema/plataformas`.

Cada plataforma tiene un `probe` que define cómo se chequea su estado:
- `self`        → versión leída del `pyproject.toml` local (sin red).
- `ontoy`       → GET al endpoint propio del proyecto (mariachi convention).
- `http_health` → GET HTTP cualquiera; 200 = healthy. La versión queda en None.
- `dataengine`  → conexión SQL a DataEngine + `SELECT version()`.
- `none`        → no hay probe; siempre healthy si la entrada existe. Útil para
                  servicios sin endpoint accesible (jobs, batch, postgres puro).

Cada plataforma puede tener `static_version` con la versión del **repositorio**
(la del CHANGELOG). Cuando está presente, el endpoint la devuelve en lugar de
la que reporte el probe — útil para repos cuya versión semántica vive en
`docs/CHANGELOG.md` y no se expone via API (acervo, gateway-hub, geoserver,
huachicol). El `healthy` siempre viene del probe.

IMPORTANTE: al bumpear el CHANGELOG de uno de esos repos, hay que sincronizar
el `static_version` de aquí. (TODO: pre-commit hook que lo verifique.)
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
        "probe": "dataengine",
        "probe_url_template": None,
        "static_version": "1.11.0",
    },
    {
        "slug": "acervo",
        "label": "Acervo",
        "url": None,
        "probe": "http_health",
        "probe_url_template": "{acervo_scheme}://{acervo_endpoint}/minio/health/live",
        "static_version": "1.17.0",
    },
    {
        "slug": "gateway-hub",
        "label": "Gateway Hub",
        "url": None,
        "probe": "none",
        "probe_url_template": None,
        "static_version": "0.1.0",
    },
    {
        "slug": "huachicol",
        "label": "Huachicol",
        "url": None,
        "probe": "none",
        "probe_url_template": None,
        "static_version": "0.1.0",
    },
    {
        "slug": "geoserver",
        "label": "GeoServer",
        "url": None,
        "probe": "http_health",
        "probe_url_template": "{geoserver_url}",
        "static_version": "1.14.1",
    },
    {
        "slug": "sieej",
        "label": "SIEEJ",
        "url": "/sieej",
        "probe": "http_health",
        "probe_url_template": "{sieej_url}",
    },
]
