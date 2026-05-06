from __future__ import annotations

import hashlib

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
        node = data.get("workspaces")
        if not isinstance(node, dict):
            return []
        workspaces = node.get("workspace", []) or []
        return [w["name"] for w in workspaces]

    def list_layers(self, workspace: str) -> list[str]:
        url = self._rest_url(f"workspaces/{workspace}/layers.json")
        with self._client() as c:
            r = c.get(url)
            if r.status_code == 404:
                return []
            r.raise_for_status()
            data = r.json()
        node = data.get("layers")
        if not isinstance(node, dict):
            return []
        layers = node.get("layer", []) or []
        return [layer["name"] for layer in layers]

    def layer_exists(self, workspace: str, layer: str) -> bool:
        url = self._rest_url(f"workspaces/{workspace}/layers/{layer}.json")
        with self._client() as c:
            r = c.get(url)
        return r.status_code == 200

    def get_legend_graphic(
        self,
        workspace: str,
        layer: str,
        style_name: str,
        width: int = 20,
        height: int = 20,
    ) -> tuple[bytes, str]:
        url = self._ows_url(f"{workspace}/wms")
        params = {
            "REQUEST": "GetLegendGraphic",
            "VERSION": "1.0.0",
            "FORMAT": "image/png",
            "WIDTH": str(width),
            "HEIGHT": str(height),
            "LAYER": f"{workspace}:{layer}",
            "STYLE": style_name,
            "LEGEND_OPTIONS": "fontAntiAliasing:true;fontSize:11;dpi:120",
        }
        with httpx.Client(auth=self._auth, timeout=self._timeout) as c:
            r = c.get(url, params=params)
            if r.status_code != 200:
                raise GeoServerError(
                    f"GetLegendGraphic falló para {workspace}:{layer} style={style_name}: "
                    f"HTTP {r.status_code}"
                )
            content_type = r.headers.get("content-type", "image/png")
            return r.content, content_type

    def get_sld(self, workspace: str, style_name: str) -> str:
        ws_url = self._rest_url(f"workspaces/{workspace}/styles/{style_name}.sld")
        global_url = self._rest_url(f"styles/{style_name}.sld")
        with httpx.Client(auth=self._auth, timeout=self._timeout) as c:
            r = c.get(ws_url)
            if r.status_code == 404:
                r = c.get(global_url)
                if r.status_code == 404:
                    raise GeoServerError(
                        f"SLD no encontrado: {workspace}:{style_name} ni global:{style_name}"
                    )
            r.raise_for_status()
            return r.text

    def style_is_global(self, workspace: str, style_name: str) -> bool:
        ws_url = self._rest_url(
            f"workspaces/{workspace}/styles/{style_name}.xml?quietOnNotFound=true"
        )
        with self._client() as c:
            r = c.get(ws_url)
            if r.status_code == 200:
                return False
        global_url = self._rest_url(f"styles/{style_name}.xml?quietOnNotFound=true")
        with self._client() as c:
            r = c.get(global_url)
            return r.status_code == 200

    def style_exists(self, workspace: str, style_name: str) -> bool:
        url = self._rest_url(
            f"workspaces/{workspace}/styles/{style_name}.xml?quietOnNotFound=true"
        )
        with self._client() as c:
            r = c.get(url)
        if r.status_code == 200:
            return True
        if r.status_code == 404:
            return False
        raise GeoServerError(
            f"Error consultando style {workspace}:{style_name}: HTTP {r.status_code}"
        )

    def create_style_entry(self, workspace: str, style_name: str) -> None:
        url = self._rest_url(f"workspaces/{workspace}/styles")
        payload = (
            f"<style><name>{style_name}</name>"
            f"<filename>{style_name}.sld</filename></style>"
        ).encode("utf-8")
        with httpx.Client(auth=self._auth, timeout=self._timeout) as c:
            r = c.post(url, content=payload, headers={"Content-Type": "text/xml"})
            if r.status_code not in (200, 201):
                raise GeoServerError(
                    f"No se pudo crear style entry {workspace}:{style_name}: "
                    f"HTTP {r.status_code} - {r.text[:200]}"
                )

    def put_sld(self, workspace: str, style_name: str, xml: str) -> str:
        local_bytes = xml.encode("utf-8")
        local_hash = hashlib.sha256(local_bytes).hexdigest()

        if not self.style_exists(workspace, style_name):
            self.create_style_entry(workspace, style_name)

        put_url = self._rest_url(
            f"workspaces/{workspace}/styles/{style_name}?raw=true"
        )
        with httpx.Client(auth=self._auth, timeout=self._timeout) as c:
            r = c.put(
                put_url,
                content=local_bytes,
                headers={"Content-Type": "application/vnd.ogc.sld+xml"},
            )
            if r.status_code != 200:
                raise GeoServerError(
                    f"Fallo PUT {workspace}:{style_name}: "
                    f"HTTP {r.status_code} - {r.text[:200]}"
                )

        remote_xml = self.get_sld(workspace, style_name)
        remote_hash = hashlib.sha256(remote_xml.encode("utf-8")).hexdigest()
        if local_hash != remote_hash:
            raise GeoServerError(
                f"Verificación SHA256 falló tras subir {workspace}:{style_name}. "
                f"local={local_hash[:12]} remote={remote_hash[:12]}"
            )
        return local_hash

    def find_layers_using_style(self, workspace: str, style_name: str) -> list[str]:
        layer_names = self.list_layers(workspace)
        sharing: list[str] = []
        for name in layer_names:
            try:
                styles = self.list_styles(workspace, name)
            except (httpx.HTTPError, GeoServerError):
                continue
            if style_name in styles or f"{workspace}:{style_name}" in styles:
                sharing.append(name)
        return sharing

    def is_layer_group(self, workspace: str, name: str) -> bool:
        for url in (
            self._rest_url(f"workspaces/{workspace}/layergroups/{name}.json?quietOnNotFound=true"),
            self._rest_url(f"layergroups/{name}.json?quietOnNotFound=true"),
        ):
            with self._client() as c:
                r = c.get(url)
                if r.status_code == 200:
                    return True
        return False

    def list_styles(self, workspace: str, layer: str) -> list[str]:
        url = self._rest_url(f"layers/{workspace}:{layer}/styles.json")
        with self._client() as c:
            r = c.get(url)
            if r.status_code == 404:
                return []
            if r.status_code >= 500:
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
