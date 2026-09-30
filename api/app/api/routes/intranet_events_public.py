import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.intranet_cliente import verificar_clave_intranet
from app.schemas.intranet_event import IntranetEventBatchIn
from app.schemas.mapalab_event import EventBatchResponse
from app.services.mapalab_telemetry import ingest_batch

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/intranet/events", tags=["intranet telemetry"])


@router.post(
    "/batch",
    response_model=EventBatchResponse,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(verificar_clave_intranet)],
)
async def ingerir_batch(request: Request, db: Session = Depends(get_db)) -> EventBatchResponse:
    try:
        payload = IntranetEventBatchIn.model_validate(await request.json())
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=exc.errors(include_url=False, include_context=False),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Body JSON inválido"
        ) from exc
    inserted = ingest_batch(
        db, payload, user_agent=request.headers.get("user-agent"), app="intranet"
    )
    return EventBatchResponse(ok=True, inserted=inserted)
