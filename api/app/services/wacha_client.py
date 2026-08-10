from __future__ import annotations

from typing import Any

import httpx

from app.core.settings import get_settings


class WachaError(Exception):
    pass


class WachaClient:
    def __init__(self, base_url: str | None = None, timeout: float | None = None):
        settings = get_settings()
        self._base_url = (base_url or settings.wacha_api_url or "").rstrip("/")
        self._timeout = timeout if timeout is not None else settings.wacha_timeout

        if not self._base_url:
            raise WachaError("WACHA_API_URL no esta configurado")

    def _url(self, path: str) -> str:
        return f"{self._base_url}/api/{path.lstrip('/')}"

    def _client(self) -> httpx.Client:
        return httpx.Client(timeout=self._timeout, headers={"Accept": "application/json"})

    def version(self) -> str:
        with self._client() as c:
            respuesta = c.get(self._url("version"))
            respuesta.raise_for_status()
            return respuesta.text.strip()

    def config(self) -> dict[str, Any]:
        with self._client() as c:
            respuesta = c.get(self._url("config"))
            respuesta.raise_for_status()
            return respuesta.json()

    def camaras(self) -> list[str]:
        return sorted((self.config().get("cameras") or {}).keys())

    def guardar_config(self, configuracion: str, aplicar: bool) -> None:
        opcion = "restart" if aplicar else "saveonly"
        with self._client() as c:
            respuesta = c.post(
                self._url("config/save"),
                params={"save_option": opcion},
                content=configuracion.encode("utf-8"),
                headers={"Content-Type": "text/plain; charset=utf-8"},
            )
            if respuesta.status_code >= 400:
                raise WachaError(self._detalle(respuesta))

    def validar_config(self, configuracion: str) -> tuple[bool, str | None]:
        try:
            self.guardar_config(configuracion, aplicar=False)
        except WachaError as exc:
            return False, str(exc)
        return True, None

    def stats(self) -> dict[str, Any]:
        with self._client() as c:
            respuesta = c.get(self._url("stats"))
            respuesta.raise_for_status()
            return respuesta.json()

    def estado_camaras(self) -> dict[str, dict[str, Any]]:
        try:
            datos = self.stats()
        except Exception as exc:
            raise WachaError(str(exc)[:300]) from exc

        estados: dict[str, dict[str, Any]] = {}
        for nombre, valores in (datos.get("cameras") or {}).items():
            if not isinstance(valores, dict):
                continue
            fps = valores.get("camera_fps", 0) or 0
            estados[nombre] = {
                "en_linea": fps > 0,
                "camera_fps": fps,
                "detection_fps": valores.get("detection_fps", 0) or 0,
                "proceso_vivo": bool(valores.get("capture_pid") or valores.get("pid")),
            }
        return estados

    def mjpeg(self, camara: str, fps: int, alto: int):
        url = self._url(camara)
        with httpx.stream(
            "GET", url, params={"fps": fps, "height": alto}, timeout=None
        ) as respuesta:
            respuesta.raise_for_status()
            yield respuesta.headers.get("content-type", "multipart/x-mixed-replace")
            for trozo in respuesta.iter_bytes():
                yield trozo

    def reiniciar(self) -> None:
        with self._client() as c:
            respuesta = c.post(self._url("restart"))
            if respuesta.status_code >= 400:
                raise WachaError(self._detalle(respuesta))

    @staticmethod
    def _detalle(respuesta: httpx.Response) -> str:
        try:
            cuerpo = respuesta.json()
        except ValueError:
            return f"HTTP {respuesta.status_code}: {respuesta.text[:200]}"
        if isinstance(cuerpo, dict):
            for clave in ("message", "detail", "error"):
                if cuerpo.get(clave):
                    return str(cuerpo[clave])[:400]
        return f"HTTP {respuesta.status_code}"
