from pydantic import BaseModel, ConfigDict


class GeneralBase(BaseModel):
    nombre_ente_gobierno: str
    unidad_admin: str
    hay_responsable: bool
    descripcion_hay_responsable: str | None = None
    desafios_oportunidades: str


class GeneralCreate(GeneralBase):
    pass


class GeneralUpdate(GeneralBase):
    pass


class GeneralResponse(GeneralBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
