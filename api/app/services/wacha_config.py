from __future__ import annotations

from typing import Any

import yaml
from sqlalchemy.orm import Session

from app.models.wacha import Camara

VERSION_CONFIG = "0.17-0"


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


def construir(db: Session) -> dict[str, Any]:
    camaras = camaras_activas(db)
    return {
        "version": VERSION_CONFIG,
        "mqtt": {"enabled": False},
        "detect": {"enabled": any(c.deteccion_habilitada for c in camaras)},
        "cameras": {c.nombre: _bloque_camara(c) for c in camaras},
    }


def como_yaml(configuracion: dict[str, Any]) -> str:
    return yaml.safe_dump(configuracion, sort_keys=False, allow_unicode=True)
