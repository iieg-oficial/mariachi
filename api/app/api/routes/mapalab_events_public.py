from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.rate_limit import rate_limit_ip
from app.schemas.mapalab_event import EventBatchIn, EventBatchResponse
from app.services.mapalab_telemetry import ingest_batch

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/mapalab/events", tags=["mapalab telemetry"])


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else None


@router.post(
    "/batch",
    response_model=EventBatchResponse,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(rate_limit_ip(max_requests=120, window_seconds=60, scope="mapalab_events"))],
)
async def ingerir_batch(
    request: Request,
    db: Session = Depends(get_db),
):
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Body JSON inválido",
        )

    try:
        payload = EventBatchIn.model_validate(body)
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.errors(),
        )

    try:
        inserted = ingest_batch(
            db,
            payload,
            ip=_client_ip(request),
            user_agent=request.headers.get("user-agent"),
            api_key_id=None,
        )
    except Exception:
        logger.exception("mapalab_events.ingest_failed session=%s", payload.session_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo persistir el lote",
        )

    return EventBatchResponse(ok=True, inserted=inserted)
