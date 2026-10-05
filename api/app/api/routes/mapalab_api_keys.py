from __future__ import annotations

from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_permission, verify_csrf
from app.core.time import utcnow
from app.models.mapalab_api_key import MapalabApiKey
from app.models.mapalab_api_key_acceso import MapalabApiKeyAcceso
from app.models.mapalab_api_key_embed import MapalabApiKeyEmbed
from app.models.mapalab_api_key_evento import MapalabApiKeyEvento
from app.models.mapalab_api_key_rendimiento import (
    MapalabApiKeyRendimientoDiario,
    MapalabApiKeySitioDiario,
)
from app.models.mapalab_api_key_uso import MapalabApiKeyUsoDiario
from app.models.user import Usuario
from app.schemas.mapalab_api_key import (
    MapalabApiKeyAccesoPage,
    MapalabApiKeyAccesoResponse,
    MapalabApiKeyCreate,
    MapalabApiKeyEmbedCreate,
    MapalabApiKeyEmbedFromLayers,
    MapalabApiKeyEmbedResponse,
    MapalabApiKeyEmbedSummary,
    MapalabApiKeyEventoResponse,
    MapalabApiKeyResponse,
    MapalabApiKeyRevealResponse,
    MapalabApiKeyRotateRequest,
    MapalabApiKeyUpdate,
    MapalabApiKeyUsoDiarioResponse,
)
from app.schemas.mapalab_api_key_telemetria import (
    MapalabApiKeyRendimientoResponse,
    MapalabApiKeySitioResponse,
)
from app.services.mapalab_embed_webhook import (
    create_share,
    fetch_share_meta,
    notify_invalidate_cache,
    pin_share_permanent,
    unpin_share,
)
from app.services.mapalab_keys import generate_api_key

router = APIRouter(prefix="/mapalab/api-keys", tags=["mapalab api-keys"])


def _to_response(api_key: MapalabApiKey) -> MapalabApiKeyResponse:
    return MapalabApiKeyResponse.model_validate(api_key)


def _validate_public_referers(visibility: str, dominios: list[str]) -> None:
    if visibility == "public" and not dominios:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Una llave pública necesita al menos un sitio autorizado. "
                "Agrega la dirección del sitio donde se va a mostrar el mapa antes de continuar."
            ),
        )


def _record_event(
    db: Session,
    api_key: MapalabApiKey,
    evento: str,
    actor: Usuario | None,
    payload: dict | None = None,
) -> None:
    db.add(
        MapalabApiKeyEvento(
            api_key_id=api_key.id,
            evento=evento,
            actor_user_id=actor.id if actor else None,
            payload=payload,
        )
    )


@router.get("", response_model=list[MapalabApiKeyResponse])
async def listar_api_keys(
    db: Session = Depends(get_db),
    estado: str | None = Query(default=None, pattern=r"^(active|suspended|revoked)$"),
    visibility: str | None = Query(default=None, pattern=r"^(public|private)$"),
    busqueda: str | None = Query(default=None, max_length=120),
):
    query = db.query(MapalabApiKey)
    if estado:
        query = query.filter(MapalabApiKey.estado == estado)
    if visibility:
        query = query.filter(MapalabApiKey.visibility == visibility)
    if busqueda:
        like = f"%{busqueda.lower()}%"
        query = query.filter(MapalabApiKey.institucion_nombre.ilike(like))
    rows = query.order_by(MapalabApiKey.id.desc()).all()
    return [_to_response(r) for r in rows]


@router.get("/{api_key_id}", response_model=MapalabApiKeyResponse)
async def obtener_api_key(api_key_id: int, db: Session = Depends(get_db)):
    api_key = db.query(MapalabApiKey).filter(MapalabApiKey.id == api_key_id).first()
    if not api_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La llave no existe (o ya fue eliminada)")
    return _to_response(api_key)


@router.post("", response_model=MapalabApiKeyRevealResponse, status_code=status.HTTP_201_CREATED)
async def crear_api_key(
    payload: MapalabApiKeyCreate,
    db: Session = Depends(get_db),
    user: Usuario = Depends(verify_csrf),
    _: Usuario = Depends(require_permission("mariachi.mapalab_llaves.manage")),
):
    _validate_public_referers(payload.visibility, payload.dominios_permitidos)

    plain_key, prefix, hashed = generate_api_key(payload.visibility)

    api_key = MapalabApiKey(
        institucion_nombre=payload.institucion_nombre,
        institucion_email_contacto=payload.institucion_email_contacto,
        descripcion=payload.descripcion,
        visibility=payload.visibility,
        key_prefix=prefix,
        key_hash=hashed,
        dominios_permitidos=payload.dominios_permitidos,
        ips_permitidas=payload.ips_permitidas,
        capas_permitidas=payload.capas_permitidas,
        cuota_diaria=payload.cuota_diaria,
        cuota_mensual=payload.cuota_mensual,
        estado="active",
        expira_en=payload.expira_en,
        notas_admin=payload.notas_admin,
        creado_por_user_id=user.id,
    )
    db.add(api_key)
    db.flush()
    _record_event(
        db,
        api_key,
        "created",
        user,
        payload={"visibility": payload.visibility, "prefix": prefix},
    )
    db.commit()
    db.refresh(api_key)

    return MapalabApiKeyRevealResponse(api_key=_to_response(api_key), plain_key=plain_key)


@router.patch("/{api_key_id}", response_model=MapalabApiKeyResponse)
async def actualizar_api_key(
    api_key_id: int,
    payload: MapalabApiKeyUpdate,
    db: Session = Depends(get_db),
    user: Usuario = Depends(verify_csrf),
    _: Usuario = Depends(require_permission("mariachi.mapalab_llaves.manage")),
):
    api_key = db.query(MapalabApiKey).filter(MapalabApiKey.id == api_key_id).first()
    if not api_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La llave no existe (o ya fue eliminada)")

    update_data = payload.model_dump(exclude_unset=True)
    if "dominios_permitidos" in update_data:
        nuevos_dominios = update_data["dominios_permitidos"] or []
        _validate_public_referers(api_key.visibility, nuevos_dominios)

    for field, value in update_data.items():
        setattr(api_key, field, value)
    api_key.actualizado_en = utcnow()

    _record_event(db, api_key, "updated", user, payload=update_data)
    db.commit()
    db.refresh(api_key)
    return _to_response(api_key)


@router.post("/{api_key_id}/rotate-key", response_model=MapalabApiKeyRevealResponse)
async def rotar_api_key(
    api_key_id: int,
    payload: MapalabApiKeyRotateRequest,
    db: Session = Depends(get_db),
    user: Usuario = Depends(verify_csrf),
    _: Usuario = Depends(require_permission("mariachi.mapalab_llaves.manage")),
):
    api_key = db.query(MapalabApiKey).filter(MapalabApiKey.id == api_key_id).first()
    if not api_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La llave no existe (o ya fue eliminada)")

    visibility = payload.visibility or api_key.visibility
    previous_prefix = api_key.key_prefix
    plain_key, prefix, hashed = generate_api_key(visibility)
    api_key.visibility = visibility
    api_key.key_prefix = prefix
    api_key.key_hash = hashed
    api_key.actualizado_en = utcnow()
    _record_event(db, api_key, "rotated", user, payload={"visibility": visibility, "prefix": prefix})
    db.commit()
    db.refresh(api_key)
    if previous_prefix:
        notify_invalidate_cache(previous_prefix)

    return MapalabApiKeyRevealResponse(api_key=_to_response(api_key), plain_key=plain_key)


def _change_estado(
    db: Session,
    api_key_id: int,
    nuevo_estado: str,
    evento: str,
    actor: Usuario,
) -> MapalabApiKeyResponse:
    api_key = db.query(MapalabApiKey).filter(MapalabApiKey.id == api_key_id).first()
    if not api_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La llave no existe (o ya fue eliminada)")
    if api_key.estado == nuevo_estado:
        return _to_response(api_key)
    api_key.estado = nuevo_estado
    api_key.actualizado_en = utcnow()
    _record_event(db, api_key, evento, actor)
    db.commit()
    db.refresh(api_key)
    if nuevo_estado in {"revoked", "suspended"}:
        notify_invalidate_cache(api_key.key_prefix)
    return _to_response(api_key)


@router.post("/{api_key_id}/revoke", response_model=MapalabApiKeyResponse)
async def revocar_api_key(
    api_key_id: int,
    db: Session = Depends(get_db),
    user: Usuario = Depends(verify_csrf),
    _: Usuario = Depends(require_permission("mariachi.mapalab_llaves.manage")),
):
    return _change_estado(db, api_key_id, "revoked", "revoked", user)


@router.post("/{api_key_id}/suspend", response_model=MapalabApiKeyResponse)
async def suspender_api_key(
    api_key_id: int,
    db: Session = Depends(get_db),
    user: Usuario = Depends(verify_csrf),
    _: Usuario = Depends(require_permission("mariachi.mapalab_llaves.manage")),
):
    return _change_estado(db, api_key_id, "suspended", "suspended", user)


@router.post("/{api_key_id}/reactivate", response_model=MapalabApiKeyResponse)
async def reactivar_api_key(
    api_key_id: int,
    db: Session = Depends(get_db),
    user: Usuario = Depends(verify_csrf),
    _: Usuario = Depends(require_permission("mariachi.mapalab_llaves.manage")),
):
    api_key = db.query(MapalabApiKey).filter(MapalabApiKey.id == api_key_id).first()
    if not api_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La llave no existe (o ya fue eliminada)")
    if api_key.estado == "revoked":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede reactivar una llave que fue cancelada. Crea una llave nueva.",
        )
    return _change_estado(db, api_key_id, "active", "reactivated", user)


@router.get("/{api_key_id}/events", response_model=list[MapalabApiKeyEventoResponse])
async def listar_eventos(
    api_key_id: int,
    db: Session = Depends(get_db),
    limit: int = Query(default=50, ge=1, le=500),
):
    api_key = db.query(MapalabApiKey).filter(MapalabApiKey.id == api_key_id).first()
    if not api_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La llave no existe (o ya fue eliminada)")
    rows = (
        db.query(MapalabApiKeyEvento)
        .filter(MapalabApiKeyEvento.api_key_id == api_key_id)
        .order_by(MapalabApiKeyEvento.creado_en.desc(), MapalabApiKeyEvento.id.desc())
        .limit(limit)
        .all()
    )
    return [MapalabApiKeyEventoResponse.model_validate(r) for r in rows]


@router.get("/{api_key_id}/usage", response_model=list[MapalabApiKeyUsoDiarioResponse])
async def listar_uso(
    api_key_id: int,
    db: Session = Depends(get_db),
    dias: int = Query(default=30, ge=1, le=365),
):
    api_key = db.query(MapalabApiKey).filter(MapalabApiKey.id == api_key_id).first()
    if not api_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La llave no existe (o ya fue eliminada)")
    desde = date.today() - timedelta(days=dias)
    rows = (
        db.query(MapalabApiKeyUsoDiario)
        .filter(
            MapalabApiKeyUsoDiario.api_key_id == api_key_id,
            MapalabApiKeyUsoDiario.dia >= desde,
        )
        .order_by(MapalabApiKeyUsoDiario.dia.asc())
        .all()
    )
    return [MapalabApiKeyUsoDiarioResponse.model_validate(r) for r in rows]


def _rango_dias(desde: date | None, hasta: date | None) -> tuple[date, date]:
    fin = hasta or date.today()
    inicio = desde or (fin - timedelta(days=29))
    if inicio > fin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La fecha inicial no puede ser posterior a la final",
        )
    return inicio, fin


def _llave_o_404(db: Session, api_key_id: int) -> MapalabApiKey:
    api_key = db.query(MapalabApiKey).filter(MapalabApiKey.id == api_key_id).first()
    if not api_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La llave no existe (o ya fue eliminada)")
    return api_key


@router.get("/{api_key_id}/rendimiento", response_model=list[MapalabApiKeyRendimientoResponse])
async def listar_rendimiento(
    api_key_id: int,
    db: Session = Depends(get_db),
    desde: date | None = Query(default=None),
    hasta: date | None = Query(default=None),
) -> list[MapalabApiKeyRendimientoResponse]:
    _llave_o_404(db, api_key_id)
    inicio, fin = _rango_dias(desde, hasta)
    rows = (
        db.query(MapalabApiKeyRendimientoDiario)
        .filter(
            MapalabApiKeyRendimientoDiario.api_key_id == api_key_id,
            MapalabApiKeyRendimientoDiario.dia >= inicio,
            MapalabApiKeyRendimientoDiario.dia <= fin,
        )
        .order_by(
            MapalabApiKeyRendimientoDiario.dia.asc(),
            MapalabApiKeyRendimientoDiario.origen.asc(),
            MapalabApiKeyRendimientoDiario.metrica.asc(),
        )
        .all()
    )
    return [MapalabApiKeyRendimientoResponse.model_validate(r) for r in rows]


@router.get("/{api_key_id}/sitios", response_model=list[MapalabApiKeySitioResponse])
async def listar_sitios(
    api_key_id: int,
    db: Session = Depends(get_db),
    desde: date | None = Query(default=None),
    hasta: date | None = Query(default=None),
) -> list[MapalabApiKeySitioResponse]:
    _llave_o_404(db, api_key_id)
    inicio, fin = _rango_dias(desde, hasta)
    rows = (
        db.query(MapalabApiKeySitioDiario)
        .filter(
            MapalabApiKeySitioDiario.api_key_id == api_key_id,
            MapalabApiKeySitioDiario.dia >= inicio,
            MapalabApiKeySitioDiario.dia <= fin,
        )
        .order_by(MapalabApiKeySitioDiario.dia.asc(), MapalabApiKeySitioDiario.origen.asc())
        .all()
    )
    return [MapalabApiKeySitioResponse.model_validate(r) for r in rows]


@router.get("/{api_key_id}/accesos", response_model=MapalabApiKeyAccesoPage)
async def listar_accesos(
    api_key_id: int,
    db: Session = Depends(get_db),
    desde: datetime | None = Query(default=None),
    hasta: datetime | None = Query(default=None),
    origin: str | None = Query(default=None, max_length=255),
    capa: str | None = Query(default=None, max_length=120),
    resultado: str | None = Query(default=None, pattern=r"^(allowed|denied|quota_exceeded)$"),
    endpoint: str | None = Query(default=None, max_length=20),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=50, ge=1, le=500),
):
    api_key = db.query(MapalabApiKey).filter(MapalabApiKey.id == api_key_id).first()
    if not api_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La llave no existe (o ya fue eliminada)")
    query = db.query(MapalabApiKeyAcceso).filter(
        or_(
            MapalabApiKeyAcceso.api_key_id == api_key_id,
            and_(
                MapalabApiKeyAcceso.api_key_id.is_(None),
                MapalabApiKeyAcceso.key_prefix == api_key.key_prefix,
            ),
        )
    )
    if desde is not None:
        query = query.filter(MapalabApiKeyAcceso.timestamp >= desde)
    if hasta is not None:
        query = query.filter(MapalabApiKeyAcceso.timestamp <= hasta)
    if origin:
        query = query.filter(MapalabApiKeyAcceso.origin.ilike(f"%{origin}%"))
    if capa:
        query = query.filter(MapalabApiKeyAcceso.layers.op('?')(capa))
    if resultado:
        query = query.filter(MapalabApiKeyAcceso.resultado == resultado)
    if endpoint:
        query = query.filter(MapalabApiKeyAcceso.endpoint == endpoint)
    total = query.count()
    rows = (
        query.order_by(MapalabApiKeyAcceso.timestamp.desc(), MapalabApiKeyAcceso.id.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )
    return MapalabApiKeyAccesoPage(
        items=[MapalabApiKeyAccesoResponse.model_validate(r) for r in rows],
        total=total,
        page=page,
        size=size,
    )


@router.delete("/{api_key_id}")
async def eliminar_api_key(
    api_key_id: int,
    db: Session = Depends(get_db),
    user: Usuario = Depends(verify_csrf),
    _: Usuario = Depends(require_permission("mariachi.mapalab_llaves.manage")),
):
    api_key = db.query(MapalabApiKey).filter(MapalabApiKey.id == api_key_id).first()
    if not api_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La llave no existe (o ya fue eliminada)")
    if api_key.estado != "revoked":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Solo se pueden eliminar llaves que ya fueron canceladas. Cancela la llave primero.",
        )
    db.delete(api_key)
    db.commit()
    return {"message": "Llave eliminada del listado"}


def _summary_from_meta(meta: dict | None) -> MapalabApiKeyEmbedSummary | None:
    if not meta:
        return None
    payload = meta.get("payload") or {}
    if not isinstance(payload, dict):
        return None
    layers_list: list[str] = []
    raw_layers = payload.get("layers")
    if isinstance(raw_layers, list):
        for entry in raw_layers:
            if isinstance(entry, dict):
                slug = entry.get("slug")
                if isinstance(slug, str) and slug:
                    layers_list.append(slug)
    view = payload.get("view") if isinstance(payload.get("view"), dict) else None
    return MapalabApiKeyEmbedSummary(layers=layers_list, view=view)


def _embed_to_response(embed: MapalabApiKeyEmbed, meta: dict | None) -> MapalabApiKeyEmbedResponse:
    pinned_until = None
    permanent = False
    kind = None
    share_exists = meta is not None
    if meta:
        kind = meta.get("kind")
        pinned_raw = meta.get("pinned_until") or meta.get("pinnedUntil")
        if pinned_raw:
            try:
                pinned_until = datetime.fromisoformat(pinned_raw.replace("Z", "+00:00"))
            except ValueError:
                pinned_until = None
            if pinned_until and pinned_until.year >= 9999:
                permanent = True
    return MapalabApiKeyEmbedResponse(
        id=embed.id,
        api_key_id=embed.api_key_id,
        share_id=embed.share_id,
        label=embed.label,
        creado_por_user_id=embed.creado_por_user_id,
        creado_en=embed.creado_en,
        pinned_until=pinned_until,
        permanent=permanent,
        share_kind=kind,
        share_exists=share_exists,
        summary=_summary_from_meta(meta),
    )


@router.get("/{api_key_id}/embeds", response_model=list[MapalabApiKeyEmbedResponse])
async def listar_embeds(
    api_key_id: int,
    db: Session = Depends(get_db),
):
    api_key = db.query(MapalabApiKey).filter(MapalabApiKey.id == api_key_id).first()
    if not api_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La llave no existe (o ya fue eliminada)")
    embeds = (
        db.query(MapalabApiKeyEmbed)
        .filter(MapalabApiKeyEmbed.api_key_id == api_key_id)
        .order_by(MapalabApiKeyEmbed.creado_en.desc(), MapalabApiKeyEmbed.id.desc())
        .all()
    )
    return [_embed_to_response(e, fetch_share_meta(e.share_id)) for e in embeds]


@router.post(
    "/{api_key_id}/embeds",
    response_model=MapalabApiKeyEmbedResponse,
    status_code=status.HTTP_201_CREATED,
)
async def crear_embed(
    api_key_id: int,
    payload: MapalabApiKeyEmbedCreate,
    db: Session = Depends(get_db),
    user: Usuario = Depends(verify_csrf),
    _: Usuario = Depends(require_permission("mariachi.mapalab_llaves.manage")),
):
    api_key = db.query(MapalabApiKey).filter(MapalabApiKey.id == api_key_id).first()
    if not api_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La llave no existe (o ya fue eliminada)")

    meta = fetch_share_meta(payload.share_id)
    if meta is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ese código de mapa no existe o ya expiró. Genera uno nuevo desde el visor MapaLab.",
        )

    existing = (
        db.query(MapalabApiKeyEmbed)
        .filter(
            MapalabApiKeyEmbed.api_key_id == api_key_id,
            MapalabApiKeyEmbed.share_id == payload.share_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este mapa ya está guardado en esta llave.",
        )

    embed = MapalabApiKeyEmbed(
        api_key_id=api_key_id,
        share_id=payload.share_id,
        label=payload.label,
        creado_por_user_id=user.id if user else None,
    )
    db.add(embed)
    db.flush()
    _record_event(db, api_key, "embed_linked", user, payload={"shareId": payload.share_id, "label": payload.label})
    db.commit()
    db.refresh(embed)

    pin_share_permanent(payload.share_id)
    meta_after = fetch_share_meta(payload.share_id) or meta
    return _embed_to_response(embed, meta_after)


@router.post(
    "/{api_key_id}/embeds/from-layers",
    response_model=MapalabApiKeyEmbedResponse,
    status_code=status.HTTP_201_CREATED,
)
async def crear_embed_from_layers(
    api_key_id: int,
    payload: MapalabApiKeyEmbedFromLayers,
    db: Session = Depends(get_db),
    user: Usuario = Depends(verify_csrf),
    _: Usuario = Depends(require_permission("mariachi.mapalab_llaves.manage")),
):
    api_key = db.query(MapalabApiKey).filter(MapalabApiKey.id == api_key_id).first()
    if not api_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La llave no existe (o ya fue eliminada)")

    envelope_payload: dict = {
        "layers": [
            {"slug": entry.slug, **({"opacity": entry.opacity} if entry.opacity is not None else {})}
            for entry in payload.layers
        ],
    }
    if payload.view and any(v is not None for v in (payload.view.lon, payload.view.lat, payload.view.zoom)):
        view = {}
        if payload.view.lon is not None:
            view["lon"] = payload.view.lon
        if payload.view.lat is not None:
            view["lat"] = payload.view.lat
        if payload.view.zoom is not None:
            view["zoom"] = payload.view.zoom
        envelope_payload["view"] = view

    envelope = {"version": 1, "kind": "single", "payload": envelope_payload}
    share = create_share(envelope)
    if not share or not share.get("id"):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo guardar el mapa en MapaLab. Intenta de nuevo.",
        )
    share_id = share["id"]

    existing = (
        db.query(MapalabApiKeyEmbed)
        .filter(
            MapalabApiKeyEmbed.api_key_id == api_key_id,
            MapalabApiKeyEmbed.share_id == share_id,
        )
        .first()
    )
    if existing:
        meta_after = fetch_share_meta(share_id)
        return _embed_to_response(existing, meta_after)

    embed = MapalabApiKeyEmbed(
        api_key_id=api_key_id,
        share_id=share_id,
        label=payload.label,
        creado_por_user_id=user.id if user else None,
    )
    db.add(embed)
    db.flush()
    _record_event(
        db,
        api_key,
        "embed_created_from_layers",
        user,
        payload={"shareId": share_id, "label": payload.label, "envelope": envelope_payload},
    )
    db.commit()
    db.refresh(embed)

    pin_share_permanent(share_id)
    meta_after = fetch_share_meta(share_id)
    return _embed_to_response(embed, meta_after)


@router.delete("/{api_key_id}/embeds/{share_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_embed(
    api_key_id: int,
    share_id: str,
    db: Session = Depends(get_db),
    user: Usuario = Depends(verify_csrf),
    _: Usuario = Depends(require_permission("mariachi.mapalab_llaves.manage")),
):
    api_key = db.query(MapalabApiKey).filter(MapalabApiKey.id == api_key_id).first()
    if not api_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La llave no existe (o ya fue eliminada)")

    embed = (
        db.query(MapalabApiKeyEmbed)
        .filter(
            MapalabApiKeyEmbed.api_key_id == api_key_id,
            MapalabApiKeyEmbed.share_id == share_id,
        )
        .first()
    )
    if not embed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ese mapa guardado no existe en esta llave")

    db.delete(embed)
    _record_event(db, api_key, "embed_unlinked", user, payload={"shareId": share_id})
    db.commit()

    remaining = (
        db.query(MapalabApiKeyEmbed)
        .filter(MapalabApiKeyEmbed.share_id == share_id)
        .count()
    )
    if remaining == 0:
        unpin_share(share_id)
    return None
