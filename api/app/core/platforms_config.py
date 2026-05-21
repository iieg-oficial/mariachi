from typing import Literal, TypedDict

Probe = Literal["self", "ontoy", "http_health", "dataengine", "none"]

_GITHUB_ORG = "https://github.com/iieg-oficial"
_TAIGA_BASE = "https://proyectosiieg.jalisco.gob.mx/project"


class PlatformConfig(TypedDict, total=False):
    slug: str
    label: str
    url: str | None
    repo: str | None
    taiga: str | None
    probe: Probe
    probe_url_template: str | None
    static_version: str | None


PLATFORMS: list[PlatformConfig] = [
    {
        "slug": "mariachi",
        "label": "Mariachi",
        "url": "/inicio",
        "repo": f"{_GITHUB_ORG}/mariachi",
        "taiga": f"{_TAIGA_BASE}/nuevo-sitio-del-iieg",
        "probe": "self",
        "probe_url_template": None,
    },
    {
        "slug": "mapalab",
        "label": "MapaLab",
        "url": "/mapa",
        "repo": f"{_GITHUB_ORG}/mapalab",
        "taiga": f"{_TAIGA_BASE}/mapalab",
        "probe": "ontoy",
        "probe_url_template": "{mapalab_backend_url}/ontoy",
    },
    {
        "slug": "dataengine",
        "label": "DataEngine",
        "url": None,
        "repo": f"{_GITHUB_ORG}/dataengine",
        "taiga": None,
        "probe": "ontoy",
        "probe_url_template": "{dataengine_ontoy_url}",
    },
    {
        "slug": "acervo",
        "label": "Acervo",
        "url": None,
        "repo": f"{_GITHUB_ORG}/acervo",
        "taiga": None,
        "probe": "ontoy",
        "probe_url_template": "{acervo_ontoy_url}",
    },
    {
        "slug": "gateway-hub",
        "label": "Gateway Hub",
        "url": None,
        "repo": f"{_GITHUB_ORG}/gateway-hub",
        "taiga": None,
        "probe": "ontoy",
        "probe_url_template": "{gateway_hub_ontoy_url}",
    },
    {
        "slug": "huachicol",
        "label": "Huachicol",
        "url": None,
        "repo": f"{_GITHUB_ORG}/huachicol",
        "taiga": None,
        "probe": "ontoy",
        "probe_url_template": "{huachicol_ontoy_url}",
    },
    {
        "slug": "geoserver",
        "label": "GeoServer",
        "url": None,
        "repo": f"{_GITHUB_ORG}/geoserver",
        "taiga": None,
        "probe": "ontoy",
        "probe_url_template": "{geoserver_ontoy_url}",
    },
    {
        "slug": "sieej",
        "label": "SIEEJ",
        "url": "/sieej",
        "repo": f"{_GITHUB_ORG}/sieej",
        "taiga": f"{_TAIGA_BASE}/siiej",
        "probe": "ontoy",
        "probe_url_template": "{sieej_ontoy_url}",
    },
]
