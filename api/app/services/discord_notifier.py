import logging

import httpx

from app.core.settings import get_settings
from app.models.reporte import Reporte

logger = logging.getLogger(__name__)

_TIPO_LABELS = {
    "problema": "Problema",
    "solicitud": "Solicitud",
    "sugerencia": "Sugerencia",
    "duda": "Duda",
    "datos_incorrectos": "Datos incorrectos",
    "bug": "Bug",
}

_TIPO_COLORS = {
    "problema": 0xE74C3C,
    "solicitud": 0x3498DB,
    "sugerencia": 0x2ECC71,
    "duda": 0xF1C40F,
    "datos_incorrectos": 0xE67E22,
    "bug": 0x9B59B6,
}


def _resolve_webhook(source_app: str) -> str | None:
    settings = get_settings()
    mapping = {
        "mapalab": settings.discord_webhook_mapalab,
        "sieej": settings.discord_webhook_sieej,
        "portal": settings.discord_webhook_portal,
    }
    return mapping.get(source_app)


def _truncate(text: str | None, length: int) -> str:
    if not text:
        return "—"
    if len(text) <= length:
        return text
    return text[: length - 1] + "…"


def notify_new_reporte(reporte: Reporte) -> None:
    webhook = _resolve_webhook(reporte.source_app)
    if not webhook:
        logger.warning(
            "discord_notifier.no_webhook source_app=%s reporte_id=%s "
            "(define DISCORD_WEBHOOK_<SOURCE> en el env)",
            reporte.source_app, reporte.id,
        )
        return

    embed = {
        "title": f"Nuevo reporte: {_TIPO_LABELS.get(reporte.tipo, reporte.tipo)}",
        "color": _TIPO_COLORS.get(reporte.tipo, 0x95A5A6),
        "fields": [
            {"name": "Origen", "value": reporte.source_app, "inline": True},
            {"name": "Ruta", "value": _truncate(reporte.source_route, 100), "inline": True},
            {"name": "Mensaje", "value": _truncate(reporte.mensaje, 500), "inline": False},
        ],
        "footer": {"text": f"ID #{reporte.id}"},
    }
    if reporte.email_contacto:
        embed["fields"].append(
            {"name": "Contacto", "value": "Dejó correo; está en el panel", "inline": True}
        )

    try:
        with httpx.Client(timeout=5.0) as client:
            client.post(webhook, json={"embeds": [embed]})
    except httpx.HTTPError:
        logger.exception("discord_notifier.failed reporte_id=%s", reporte.id)
