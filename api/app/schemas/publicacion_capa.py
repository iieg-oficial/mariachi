from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class PublicacionCapaResponse(BaseModel):
    id: int
    resource_type: str
    resource_id: str
    antes: dict[str, Any]
    despues: dict[str, Any]
    usuario: str | None
    origen: str
    deshace_id: int | None
    deshecha_en: datetime | None
    deshecha_por: str | None
    creado_en: datetime

    model_config = ConfigDict(from_attributes=True)
