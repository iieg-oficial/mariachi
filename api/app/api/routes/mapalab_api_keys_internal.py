from __future__ import annotations

import hmac
import logging
from datetime import date

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.settings import get_settings
from app.core.time import utcnow
from app.models.mapalab_api_key import MapalabApiKey
from app.models.mapalab_api_key_acceso import MapalabApiKeyAcceso
from app.models.mapalab_api_key_uso import MapalabApiKeyUsoDiario
from app.schemas.mapalab_api_key import (
    MapalabApiKeyAccesoBatch,
    MapalabApiKeyUsageBatch,
    MapalabApiKeyValidateRequest,
    MapalabApiKeyValidateResponse,
)
from app.schemas.mapalab_api_key_telemetria import (
    MapalabApiKeyRendimientoBatch,
    MapalabApiKeySitioBatch,
)
from app.services.mapalab_keys import (
    PRIVATE_PREFIX,
    PUBLIC_PREFIX,
    match_ip,
    match_layer,
    match_origin,
    verify_api_key,
    visibility_from_key,
    visible_prefix_from_key,
)
from app.services.mapalab_keys_telemetria import registrar_rendimiento, registrar_sitios

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/internal/mapalab/keys", tags=["mapalab internal"])


def _require_internal_token(
    x_internal_token: str | None = Header(default=None, alias="X-Internal-Token"),
) -> None:
    settings = get_settings()
    expected = settings.mapalab_internal_token
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="MAPALAB_INTERNAL_TOKEN no configurado en mariachi-api",
        )
    if not x_internal_token or not hmac.compare_digest(x_internal_token.encode(), expected.encode()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token interno inválido",
        )


def _invalid(reason: str) -> MapalabApiKeyValidateResponse:
    return MapalabApiKeyValidateResponse(valid=False, reason=reason)


@router.post("/validate", response_model=MapalabApiKeyValidateResponse)
async def validar_api_key(
    payload: MapalabApiKeyValidateRequest,
    db: Session = Depends(get_db),
    _: None = Depends(_require_internal_token),
):
    plain_key = (payload.key or "").strip()
    if not plain_key.startswith(PUBLIC_PREFIX) and not plain_key.startswith(PRIVATE_PREFIX):
        return _invalid("invalid_format")

    visibility = visibility_from_key(plain_key)
    visible_prefix = visible_prefix_from_key(plain_key)
    if not visibility or not visible_prefix:
        return _invalid("invalid_format")

    candidates = (
        db.query(MapalabApiKey)
        .filter(MapalabApiKey.key_prefix == visible_prefix)
        .all()
    )
    matched: MapalabApiKey | None = None
    for candidate in candidates:
        if verify_api_key(plain_key, candidate.key_hash):
            matched = candidate
            break
    if matched is None:
        return _invalid("invalid_key")

    if matched.estado == "revoked":
        return _invalid("revoked")
    if matched.estado == "suspended":
        return _invalid("suspended")
    if matched.estado != "active":
        return _invalid("inactive")

    if matched.expira_en is not None:
        ahora = utcnow()
        expira = matched.expira_en
        if expira.tzinfo is None:
            from datetime import timezone
            expira = expira.replace(tzinfo=timezone.utc)
        if ahora >= expira:
            return _invalid("expired")

    if visibility == "public":
        if not match_origin(payload.origin, matched.dominios_permitidos or []):
            logger.warning(
                "mapalab_api_keys.origin_blocked prefix=%s origin=%s patterns=%s",
                matched.key_prefix,
                payload.origin,
                matched.dominios_permitidos,
            )
            return _invalid("origin_blocked")
    else:
        if matched.ips_permitidas and not match_ip(payload.ip, matched.ips_permitidas):
            return _invalid("ip_blocked")

    if matched.capas_permitidas:
        for layer_id in payload.requested_layers:
            if not match_layer(layer_id, matched.capas_permitidas):
                return _invalid(f"layer_blocked:{layer_id}")

    matched.usado_en = utcnow()
    db.commit()

    return MapalabApiKeyValidateResponse(
        valid=True,
        key_id=matched.id,
        visibility=visibility,
        capas_permitidas=list(matched.capas_permitidas or []),
        dominios_permitidos=list(matched.dominios_permitidos or []),
        cuota_diaria=matched.cuota_diaria,
        cuota_mensual=matched.cuota_mensual,
        institucion_nombre=matched.institucion_nombre,
    )


@router.post("/accesos")
async def registrar_accesos_batch(
    payload: MapalabApiKeyAccesoBatch,
    db: Session = Depends(get_db),
    _: None = Depends(_require_internal_token),
):
    if not payload.items:
        return {"ok": True, "inserts": 0}
    inserts = 0
    valid_key_ids: set[int] = set()
    for item in payload.items:
        if item.api_key_id is not None and item.api_key_id not in valid_key_ids:
            exists = db.query(MapalabApiKey.id).filter(MapalabApiKey.id == item.api_key_id).first()
            if not exists:
                continue
            valid_key_ids.add(item.api_key_id)
        ts = item.timestamp
        dia = ts.date() if hasattr(ts, "date") else date.today()
        db.add(MapalabApiKeyAcceso(
            api_key_id=item.api_key_id,
            key_prefix=(item.key_prefix or None) and item.key_prefix[:20],
            timestamp=ts,
            dia=dia,
            endpoint=item.endpoint[:20],
            resultado=item.resultado[:20],
            motivo=(item.motivo or None) and item.motivo[:120],
            origin=(item.origin or None) and item.origin[:255],
            ip_hash=(item.ip_hash or None) and item.ip_hash[:64],
            layers=list(item.layers or []),
            request_id=(item.request_id or None) and item.request_id[:40],
        ))
        inserts += 1
    db.commit()
    return {"ok": True, "inserts": inserts}


@router.post("/usage")
async def registrar_uso_batch(
    payload: MapalabApiKeyUsageBatch,
    db: Session = Depends(get_db),
    _: None = Depends(_require_internal_token),
):
    if not payload.items:
        return {"ok": True, "upserts": 0}

    upserts = 0
    for item in payload.items:
        try:
            dia = date.fromisoformat(item.dia)
        except ValueError:
            continue
        if not db.query(MapalabApiKey.id).filter(MapalabApiKey.id == item.key_id).first():
            continue
        stmt = pg_insert(MapalabApiKeyUsoDiario).values(
            api_key_id=item.key_id,
            dia=dia,
            requests=item.requests,
            errores=item.errores,
            bytes_out=item.bytes_out,
        )
        stmt = stmt.on_conflict_do_update(
            constraint="pk_mapalab_api_keys_uso_diario",
            set_={
                "requests": MapalabApiKeyUsoDiario.requests + item.requests,
                "errores": MapalabApiKeyUsoDiario.errores + item.errores,
                "bytes_out": MapalabApiKeyUsoDiario.bytes_out + item.bytes_out,
            },
        )
        db.execute(stmt)
        upserts += 1
    db.commit()
    return {"ok": True, "upserts": upserts}


@router.post("/rendimiento")
async def registrar_rendimiento_batch(
    payload: MapalabApiKeyRendimientoBatch,
    db: Session = Depends(get_db),
    _: None = Depends(_require_internal_token),
) -> dict[str, bool | int]:
    if not payload.items:
        return {"ok": True, "upserts": 0}
    return {"ok": True, "upserts": registrar_rendimiento(db, payload.items)}


@router.post("/sitios")
async def registrar_sitios_batch(
    payload: MapalabApiKeySitioBatch,
    db: Session = Depends(get_db),
    _: None = Depends(_require_internal_token),
) -> dict[str, bool | int]:
    if not payload.items:
        return {"ok": True, "upserts": 0}
    return {"ok": True, "upserts": registrar_sitios(db, payload.items)}
