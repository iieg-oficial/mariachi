from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.columna_tabla import FORMATOS


class ColumnaTablaItem(BaseModel):
    columna: str = Field(min_length=1, max_length=200)
    alias: str | None = Field(default=None, max_length=200)
    orden: int = Field(default=0, ge=0, le=999)
    visible: bool = True
    formato: str | None = None

    model_config = ConfigDict(populate_by_name=True)

    @field_validator('formato')
    @classmethod
    def formato_valido(cls, value: str | None) -> str | None:
        if value in (None, ''):
            return None
        if value not in FORMATOS:
            raise ValueError(f"formato debe ser uno de {', '.join(FORMATOS)}")
        return value

    @field_validator('alias')
    @classmethod
    def alias_limpio(cls, value: str | None) -> str | None:
        if value is None:
            return None
        limpio = value.strip()
        return limpio or None


class ColumnasTablaUpdate(BaseModel):
    columnas: list[ColumnaTablaItem] = Field(default_factory=list, max_length=200)

    @field_validator('columnas')
    @classmethod
    def sin_repetidas(cls, value: list[ColumnaTablaItem]) -> list[ColumnaTablaItem]:
        nombres = [item.columna for item in value]
        if len(nombres) != len(set(nombres)):
            raise ValueError('hay columnas repetidas')
        return value


class ColumnasTablaResponse(BaseModel):
    layer_key: str = Field(serialization_alias='layerKey')
    columnas: list[ColumnaTablaItem]

    model_config = ConfigDict(populate_by_name=True)
