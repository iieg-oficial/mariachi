from __future__ import annotations

import re
from urllib.parse import quote

import httpx

from app.services.geoserver_client import GeoServerClient, GeoServerError


class MosaicClient(GeoServerClient):
    def list_coveragestores(self, workspace: str) -> list[str]:
        url = self._rest_url(f"workspaces/{workspace}/coveragestores.json")
        with self._client() as c:
            r = c.get(url)
            if r.status_code == 404:
                return []
            r.raise_for_status()
            data = r.json()
        node = data.get("coverageStores")
        if not isinstance(node, dict):
            return []
        stores = node.get("coverageStore", []) or []
        if isinstance(stores, dict):
            stores = [stores]
        return [s["name"] for s in stores if s.get("name")]

    def get_coveragestore(self, workspace: str, store: str) -> dict:
        url = self._rest_url(f"workspaces/{workspace}/coveragestores/{store}.json")
        with self._client() as c:
            r = c.get(url)
            if r.status_code == 404:
                raise GeoServerError(f"coveragestore {workspace}:{store} no existe")
            r.raise_for_status()
            data = r.json()
        return data.get("coverageStore") or {}

    def list_coverages(self, workspace: str, store: str) -> list[str]:
        url = self._rest_url(
            f"workspaces/{workspace}/coveragestores/{store}/coverages.json"
        )
        with self._client() as c:
            r = c.get(url)
            if r.status_code == 404:
                return []
            r.raise_for_status()
            data = r.json()
        node = data.get("coverages")
        if not isinstance(node, dict):
            return []
        coverages = node.get("coverage", []) or []
        if isinstance(coverages, dict):
            coverages = [coverages]
        return [c["name"] for c in coverages if c.get("name")]

    def get_coverage(self, workspace: str, store: str, coverage: str) -> dict:
        url = self._rest_url(
            f"workspaces/{workspace}/coveragestores/{store}/coverages/{coverage}.json"
        )
        with self._client() as c:
            r = c.get(url)
            if r.status_code == 404:
                raise GeoServerError(f"coverage {workspace}:{coverage} no existe")
            r.raise_for_status()
            data = r.json()
        return data.get("coverage") or {}

    def _resource_url(self, path: str) -> str:
        clean = quote(path.strip("/"), safe="/")
        return f"{self._base_url}/rest/resource/{clean}"

    def list_resource_files(self, path: str) -> list[str]:
        url = f"{self._resource_url(path)}?format=json"
        with self._client() as c:
            r = c.get(url)
            if r.status_code == 404:
                return []
            r.raise_for_status()
            data = r.json()
        directory = data.get("ResourceDirectory") or {}
        children = (directory.get("children") or {}).get("child") or []
        if isinstance(children, dict):
            children = [children]
        names: list[str] = []
        for child in children:
            name = child.get("name")
            if not name:
                continue
            ctype = (child.get("link") or {}).get("type")
            is_dir = ctype == "application/json" or (ctype == "text/html" and "." not in name)
            if not is_dir:
                names.append(name)
        return names

    def get_resource(self, path: str) -> bytes:
        with httpx.Client(auth=self._auth, timeout=self._timeout) as c:
            r = c.get(self._resource_url(path))
            if r.status_code == 404:
                raise GeoServerError(f"recurso no encontrado: {path}")
            r.raise_for_status()
            return r.content

    def put_resource(self, path: str, content: bytes) -> None:
        with httpx.Client(auth=self._auth, timeout=self._timeout) as c:
            r = c.put(
                self._resource_url(path),
                content=content,
                headers={"Content-Type": "application/octet-stream"},
            )
            if r.status_code not in (200, 201):
                raise GeoServerError(
                    f"no se pudo escribir {path} (HTTP {r.status_code}): {r.text[:200]}"
                )

    def delete_resource(self, path: str) -> bool:
        with httpx.Client(auth=self._auth, timeout=self._timeout) as c:
            r = c.delete(self._resource_url(path))
            if r.status_code == 404:
                return False
            if r.status_code not in (200, 204):
                raise GeoServerError(
                    f"no se pudo borrar {path} (HTTP {r.status_code}): {r.text[:200]}"
                )
            return True

    def reset(self) -> None:
        url = self._rest_url("reset")
        with httpx.Client(auth=self._auth, timeout=120.0) as c:
            r = c.post(url)
            if r.status_code not in (200, 205):
                raise GeoServerError(f"reset fallido (HTTP {r.status_code}): {r.text[:200]}")

    def render_probe(self, workspace: str, layer: str, bbox: str, srs: str) -> tuple[int, str]:
        params = {
            "service": "WMS",
            "version": "1.1.1",
            "request": "GetMap",
            "layers": f"{workspace}:{layer}",
            "srs": srs,
            "bbox": bbox,
            "width": "400",
            "height": "380",
            "format": "image/png",
            "styles": "",
            "exceptions": "application/vnd.ogc.se_xml",
        }
        with httpx.Client(auth=self._auth, timeout=self._timeout) as c:
            r = c.get(self._ows_url(f"{workspace}/wms"), params=params)
            r.raise_for_status()
            return len(r.content), r.headers.get("Content-Type", "")

    def coveragestore_exists(self, workspace: str, store: str) -> bool:
        url = self._rest_url(f"workspaces/{workspace}/coveragestores/{store}.json")
        with self._client() as c:
            return c.get(url).status_code == 200

    def create_external_mosaic(self, workspace: str, store: str, absolute_path: str) -> None:
        url = self._rest_url(
            f"workspaces/{workspace}/coveragestores/{store}/external.imagemosaic"
        )
        with httpx.Client(auth=self._auth, timeout=PUBLISH_TIMEOUT) as c:
            r = c.put(url, content=absolute_path.encode("utf-8"), headers={"Content-Type": "text/plain"})
        if r.status_code not in (200, 201):
            raise GeoServerError(_mosaic_failure(r))

    def harvest_granule(self, workspace: str, store: str, absolute_path: str) -> None:
        url = self._rest_url(
            f"workspaces/{workspace}/coveragestores/{store}/external.imagemosaic"
        )
        with httpx.Client(auth=self._auth, timeout=PUBLISH_TIMEOUT) as c:
            r = c.post(url, content=absolute_path.encode("utf-8"), headers={"Content-Type": "text/plain"})
        if r.status_code not in (200, 201, 202):
            raise GeoServerError(_mosaic_failure(r))

    def set_coveragestore_url(self, workspace: str, store: str, store_url: str) -> None:
        url = self._rest_url(f"workspaces/{workspace}/coveragestores/{store}")
        with self._client() as c:
            r = c.put(url, json={"coverageStore": {"url": store_url}})
        if r.status_code != 200:
            raise GeoServerError(f"no se pudo fijar la ruta del store (HTTP {r.status_code})")

    def delete_coveragestore(self, workspace: str, store: str) -> None:
        url = self._rest_url(f"workspaces/{workspace}/coveragestores/{store}")
        with self._client() as c:
            r = c.delete(url, params={"recurse": "true"})
        if r.status_code not in (200, 404):
            raise GeoServerError(f"no se pudo borrar el store (HTTP {r.status_code})")

    def get_coverage_xml(self, workspace: str, store: str, coverage: str) -> str:
        url = self._rest_url(
            f"workspaces/{workspace}/coveragestores/{store}/coverages/{coverage}.xml"
        )
        with httpx.Client(auth=self._auth, timeout=self._timeout) as c:
            r = c.get(url)
        if r.status_code != 200:
            raise GeoServerError(f"coverage {workspace}:{coverage} no existe")
        return r.text

    def put_coverage_xml(self, workspace: str, store: str, coverage: str, xml: str) -> None:
        url = self._rest_url(
            f"workspaces/{workspace}/coveragestores/{store}/coverages/{coverage}"
        )
        with httpx.Client(auth=self._auth, timeout=self._timeout) as c:
            r = c.put(url, content=xml.encode("utf-8"), headers={"Content-Type": "text/xml"})
        if r.status_code != 200:
            raise GeoServerError(
                f"no se pudo actualizar el coverage (HTTP {r.status_code}): {r.text[:200]}"
            )

    def list_granules(self, workspace: str, store: str, coverage: str) -> list[dict]:
        url = self._rest_url(
            f"workspaces/{workspace}/coveragestores/{store}/coverages/{coverage}/index/granules.json"
        )
        with httpx.Client(auth=self._auth, timeout=PUBLISH_TIMEOUT) as c:
            r = c.get(url)
        if r.status_code == 404:
            return []
        r.raise_for_status()
        return [f.get("properties") or {} for f in r.json().get("features") or []]

    def advertises_time(self, workspace: str, layer: str) -> bool:
        params = {"service": "WMS", "version": "1.3.0", "request": "GetCapabilities"}
        with httpx.Client(auth=self._auth, timeout=self._timeout) as c:
            r = c.get(self._ows_url(f"{workspace}/{layer}/wms"), params=params)
        if r.status_code != 200:
            return False
        return re.search(r'<Dimension[^>]*name="time"', r.text) is not None


PUBLISH_TIMEOUT = 300.0


def _mosaic_failure(response: httpx.Response) -> str:
    body = re.sub(r"(?is)<(style|title)[^>]*>.*?</\1>", " ", response.text or "")
    body = re.sub(r"<[^>]+>", " ", body)
    body = " ".join(body.split())[:200]
    return f"GeoServer rechazo el mosaico (HTTP {response.status_code}) {body}".strip()
