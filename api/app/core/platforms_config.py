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
        "static_version": "1.20.1",
    },
    {
        "slug": "gateway-hub",
        "label": "Gateway Hub",
        "url": None,
        "probe": "ontoy",
        "probe_url_template": "{gateway_hub_ontoy_url}",
        "static_version": "1.24.5",
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
