from __future__ import annotations

import re
from typing import Any

import yaml
from sqlalchemy.orm import Session

from app.core.settings import get_settings
from app.models.frames import Camara

VERSION_CONFIG = "0.17-0"
RTSP_PASSWORD_PLACEHOLDER = "{FRIGATE_RTSP_PASSWORD}"
MASCARA = "****"

_CREDENCIALES = re.compile(r"(rtsp://)([^/@\s]+)@")
_PLACEHOLDER = re.compile(r"^\{FRIGATE_[A-Z0-9_]+\}$")


class FramesConfigError(Exception):
    pass


def _enmascarar_parte(parte: str) -> str:
    return parte if _PLACEHOLDER.match(parte) else MASCARA


def _enmascarar_credenciales(coincidencia: re.Match[str]) -> str:
    usuario, _, clave = coincidencia.group(2).partition(":")
    enmascarado = _enmascarar_parte(usuario)
    if clave:
        enmascarado = f"{enmascarado}:{_enmascarar_parte(clave)}"
    return f"{coincidencia.group(1)}{enmascarado}@"


def enmascarar_rtsp(texto: str | None) -> str | None:
    if not texto:
        return texto
    return _CREDENCIALES.sub(_enmascarar_credenciales, texto)


def conservar_credenciales(nueva: str, anterior: str | None) -> str:
    if MASCARA not in nueva or not anterior:
        return nueva
    previas = _CREDENCIALES.search(anterior)
    if previas is None:
        return _CREDENCIALES.sub(r"\1", nueva)
    return _CREDENCIALES.sub(lambda _: f"rtsp://{previas.group(2)}@", nueva, count=1)


def camaras_activas(db: Session) -> list[Camara]:
    return (
        db.query(Camara)
        .filter(Camara.habilitada.is_(True))
        .order_by(Camara.orden, Camara.nombre)
        .all()
    )


def _bloque_camara(camara: Camara) -> dict[str, Any]:
    roles = ["detect"]
    if camara.grabacion_habilitada:
        roles.append("record")

    record: dict[str, Any] = {"enabled": camara.grabacion_habilitada}
    if camara.grabacion_habilitada:
        record["continuous"] = {"days": camara.retencion_dias}

    return {
        "ffmpeg": {"inputs": [{"path": camara.rtsp_url, "roles": roles}]},
        "detect": {"enabled": camara.deteccion_habilitada},
        "record": record,
    }


def _go2rtc() -> dict[str, Any]:
    usuario = get_settings().frames_rtsp_username
    if not usuario:
        raise FramesConfigError(
            "FRAMES_RTSP_USERNAME no esta configurado: el restream RTSP quedaria sin credencial"
        )
    return {"rtsp": {"username": usuario, "password": RTSP_PASSWORD_PLACEHOLDER}}


def construir(db: Session) -> dict[str, Any]:
    camaras = camaras_activas(db)
    return {
        "version": VERSION_CONFIG,
        "mqtt": {"enabled": False},
        "go2rtc": _go2rtc(),
        "detect": {
            "enabled": any(c.deteccion_habilitada for c in camaras),
            "fps": get_settings().frames_detect_fps,
        },
        "cameras": {c.nombre: _bloque_camara(c) for c in camaras},
    }


def como_yaml(configuracion: dict[str, Any]) -> str:
    return yaml.safe_dump(configuracion, sort_keys=False, allow_unicode=True)
