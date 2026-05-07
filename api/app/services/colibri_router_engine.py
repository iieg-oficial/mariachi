import logging

import httpx
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.colibri_route import ColibriRoute
from app.models.reporte import Reporte
from app.models.reporte_tipo import ReporteTipo

logger = logging.getLogger(__name__)

_HTTP_TIMEOUT = 5.0


def _matches_filtros(reporte: Reporte, filtros: dict | None) -> bool:
    if not filtros:
        return True
    estados_permitidos = filtros.get("estados")
    if isinstance(estados_permitidos, list) and reporte.estado not in estados_permitidos:
        return False
    tipos_permitidos = filtros.get("tipos")
    if isinstance(tipos_permitidos, list) and reporte.tipo not in tipos_permitidos:
        return False
    return True


def _routes_para(reporte: Reporte, db: Session) -> list[ColibriRoute]:
    return (
        db.query(ColibriRoute)
        .filter(ColibriRoute.activo.is_(True))
        .filter(
            or_(
                ColibriRoute.source_app_id.is_(None),
                ColibriRoute.source_app_id == reporte.source_app_id,
            )
        )
        .filter(
            or_(
                ColibriRoute.tipo_id.is_(None),
                ColibriRoute.tipo_id == reporte.tipo_id,
            )
        )
        .order_by(ColibriRoute.orden.asc(), ColibriRoute.id.asc())
        .all()
    )


def _build_payload(reporte: Reporte, tipo: ReporteTipo | None) -> dict:
    return {
        "id": reporte.id,
        "tipo": reporte.tipo,
        "tipo_label": tipo.label if tipo else reporte.tipo,
        "mensaje": reporte.mensaje,
        "source_app": reporte.source_app,
        "source_route": reporte.source_route,
        "estado": reporte.estado,
        "creado_en": reporte.creado_en.isoformat() if reporte.creado_en else None,
        "email_contacto": reporte.email_contacto,
    }


def _dispatch_webhook_generico(url: str, payload: dict, headers: dict | None = None) -> None:
    try:
        with httpx.Client(timeout=_HTTP_TIMEOUT) as client:
            client.post(url, json=payload, headers=headers or {})
    except Exception as exc:
        logger.warning("colibri.webhook fail url=%s error=%s", url, exc)


def _dispatch_slack(url: str, payload: dict) -> None:
    text = (
        f"*[Colibri] {payload.get('tipo_label')}* en `{payload.get('source_app')}`\n"
        f"{(payload.get('mensaje') or '')[:500]}\n"
        f"_id={payload.get('id')} · ruta={payload.get('source_route') or '—'}_"
    )
    _dispatch_webhook_generico(url, {"text": text})


def _dispatch_discord(url: str, payload: dict) -> None:
    content = (
        f"**[Colibri] {payload.get('tipo_label')}** en `{payload.get('source_app')}`\n"
        f"{(payload.get('mensaje') or '')[:500]}\n"
        f"id={payload.get('id')} · ruta={payload.get('source_route') or '—'}"
    )
    _dispatch_webhook_generico(url, {"content": content})


def _dispatch_email(_to: str, _payload: dict) -> None:
    logger.info(
        "colibri.email pendiente: integración SMTP/transactional aún no implementada (to=%s)",
        _to,
    )


def dispatch_reporte(reporte: Reporte, db: Session) -> None:
    """Best-effort fan-out: nunca levanta. Errores se loggean."""
    try:
        routes = _routes_para(reporte, db)
    except Exception:
        logger.exception("colibri.dispatch routes lookup failed reporte=%s", reporte.id)
        return

    if not routes:
        return

    tipo = (
        db.query(ReporteTipo).filter(ReporteTipo.id == reporte.tipo_id).first()
        if reporte.tipo_id
        else None
    )
    payload = _build_payload(reporte, tipo)

    for route in routes:
        try:
            if not _matches_filtros(reporte, route.filtros):
                continue
            config = route.config or {}
            if route.destino == "discord":
                _dispatch_discord(config.get("url", ""), payload)
            elif route.destino == "slack":
                _dispatch_slack(config.get("url", ""), payload)
            elif route.destino == "webhook":
                _dispatch_webhook_generico(
                    config.get("url", ""),
                    payload,
                    headers=config.get("headers") if isinstance(config.get("headers"), dict) else None,
                )
            elif route.destino == "email":
                _dispatch_email(config.get("to", ""), payload)
            else:
                logger.warning("colibri.dispatch destino desconocido=%s route=%s", route.destino, route.id)
        except Exception:
            logger.exception("colibri.dispatch route=%s reporte=%s", route.id, reporte.id)
