from typing import Literal

from pydantic import BaseModel, Field

TipoEspacio = Literal[
    "oficina", "trabajo", "sala", "recepcion", "comedor", "circulacion", "exterior", "servicio"
]


class EspacioUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=150)
    tipo: TipoEspacio | None = None
    piso_id: int | None = None
    incluir: bool | None = None
    orden: int | None = Field(default=None, ge=0)
