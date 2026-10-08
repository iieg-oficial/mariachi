from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from app.schemas._camel import CamelCaseInput


class MapalabApiKeyRendimientoItem(CamelCaseInput):
    key_id: int
    dia: str
    origen: str | None = ""
    metrica: str = Field(..., min_length=1)
    muestras: int = 0
    suma: float = 0.0
    buenas: int = 0
    regulares: int = 0
    malas: int = 0


class MapalabApiKeyRendimientoBatch(CamelCaseInput):
    items: list[MapalabApiKeyRendimientoItem] = Field(default_factory=list)


class MapalabApiKeySitioItem(CamelCaseInput):
    key_id: int
    dia: str
    origen: str | None = ""
    cargas: int = 0
    listos: int = 0
    errores_js: int = 0
    denegados: int = 0
    timeouts: int = 0


class MapalabApiKeySitioBatch(CamelCaseInput):
    items: list[MapalabApiKeySitioItem] = Field(default_factory=list)


class MapalabApiKeyRendimientoResponse(BaseModel):
    api_key_id: int = Field(..., serialization_alias="apiKeyId")
    dia: date
    origen: str
    metrica: str
    muestras: int
    suma: float
    buenas: int
    regulares: int
    malas: int

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class MapalabApiKeySitioResponse(BaseModel):
    api_key_id: int = Field(..., serialization_alias="apiKeyId")
    dia: date
    origen: str
    cargas: int
    listos: int
    errores_js: int = Field(..., serialization_alias="erroresJs")
    denegados: int
    timeouts: int

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
