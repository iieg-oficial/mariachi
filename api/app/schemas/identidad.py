from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MarcaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    codigo: str
    nombre: str
    descripcion: str | None = None
    activa: bool
    created_at: datetime
    updated_at: datetime
