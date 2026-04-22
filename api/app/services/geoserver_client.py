from __future__ import annotations

import httpx

from app.core.settings import get_settings


class GeoServerError(Exception):
    pass


class GeoServerClient:
    def __init__(
        self,
        base_url: str | None = None,
        user: str | None = None,
        password: str | None = None,
        timeout: float | None = None,
    ):
        settings = get_settings()
        self._base_url = (base_url or settings.geoserver_url or "").rstrip("/")
        self._user = user or settings.geoserver_user
        self._password = password or settings.geoserver_password
        self._timeout = timeout if timeout is not None else settings.geoserver_timeout

        if not self._base_url:
            raise GeoServerError("GEOSERVER_URL no esta configurado")

        self._auth = (self._user, self._password) if self._user else None

    def _rest_url(self, path: str) -> str:
        return f"{self._base_url}/rest/{path.lstrip('/')}"

    def _ows_url(self, path: str = "ows") -> str:
        return f"{self._base_url}/{path.lstrip('/')}"

    def _client(self) -> httpx.Client:
        return httpx.Client(
            auth=self._auth,
            timeout=self._timeout,
            headers={"Accept": "application/json"},
        )

    def list_workspaces(self) -> list[str]:
        url = self._rest_url("workspaces.json")
        with self._client() as c:
            r = c.get(url)
            r.raise_for_status()
            data = r.json()
        workspaces = data.get("workspaces", {}).get("workspace", []) or []
        return [w["name"] for w in workspaces]

    def list_layers(self, workspace: str) -> list[str]:
        url = self._rest_url(f"workspaces/{workspace}/layers.json")
        with self._client() as c:
            r = c.get(url)
            if r.status_code == 404:
                return []
            r.raise_for_status()
            data = r.json()
        layers = data.get("layers", {}).get("layer", []) or []
        return [layer["name"] for layer in layers]

    def layer_exists(self, workspace: str, layer: str) -> bool:
        url = self._rest_url(f"workspaces/{workspace}/layers/{layer}.json")
        with self._client() as c:
            r = c.get(url)
        return r.status_code == 200

    def list_styles(self, workspace: str, layer: str) -> list[str]:
        url = self._rest_url(f"layers/{workspace}:{layer}/styles.json")
        with self._client() as c:
            r = c.get(url)
            if r.status_code == 404:
                return []
            r.raise_for_status()
            data = r.json()
        styles_node = data.get("styles")
        names: list[str] = []
        if isinstance(styles_node, dict):
            items = styles_node.get("style", []) or []
            names = [s["name"] for s in items if isinstance(s, dict) and s.get("name")]

        default_url = self._rest_url(f"layers/{workspace}:{layer}.json")
        with self._client() as c:
            r = c.get(default_url)
            if r.status_code == 200:
                default = r.json().get("layer", {}).get("defaultStyle", {}).get("name")
                if default and default not in names:
                    names.insert(0, default)
        return names

    def list_fields(self, workspace: str, layer: str) -> list[dict]:
        url = self._ows_url()
        params = {
            "service": "WFS",
            "version": "2.0.0",
            "request": "DescribeFeatureType",
            "typeNames": f"{workspace}:{layer}",
            "outputFormat": "application/json",
        }
        with self._client() as c:
            r = c.get(url, params=params)
            r.raise_for_status()
            try:
                data = r.json()
            except ValueError as e:
                raise GeoServerError(
                    f"Respuesta no-JSON de DescribeFeatureType {workspace}:{layer}"
                ) from e
        feature_types = data.get("featureTypes") or []
        if not feature_types:
            return []
        properties = feature_types[0].get("properties") or []
        result = []
        for prop in properties:
            result.append({
                "name": prop.get("name"),
                "type": _normalize_type(prop.get("localType") or prop.get("type")),
            })
        return result

    def sample_values(
        self, workspace: str, layer: str, field: str, limit: int = 20
    ) -> list:
        url = self._ows_url()
        params = {
            "service": "WFS",
            "version": "2.0.0",
            "request": "GetFeature",
            "typeNames": f"{workspace}:{layer}",
            "propertyName": field,
            "count": str(limit),
            "outputFormat": "application/json",
        }
        with self._client() as c:
            r = c.get(url, params=params)
            r.raise_for_status()
            data = r.json()
        features = data.get("features") or []
        seen = []
        for f in features:
            v = (f.get("properties") or {}).get(field)
            if v is not None and v not in seen:
                seen.append(v)
        return seen


def _normalize_type(raw: str | None) -> str:
    if not raw:
        return "unknown"
    lowered = raw.lower()
    if lowered in ("int", "integer", "long", "short"):
        return "integer"
    if lowered in ("double", "float", "decimal", "number"):
        return "number"
    if lowered in ("boolean", "bool"):
        return "boolean"
    if lowered in ("date", "datetime", "timestamp", "time"):
        return "date"
    if "geometry" in lowered or "point" in lowered or "polygon" in lowered or "line" in lowered:
        return "geometry"
    return "string"
