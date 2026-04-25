from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class CatalogoEjeEstrategicoResponse(BaseModel):
    id: int
    value: str

    model_config = ConfigDict(from_attributes=True)


class BasesDatosBase(BaseModel):
    nombre_bd: str
    descripcion_bd: str
    categoria_datos: Optional[str] = None
    herramientas_gestion: Optional[str] = None
    calidad_datos: Optional[str] = None
    limpieza_validacion: Optional[bool] = None
    desc_limpieza_validacion: Optional[str] = None
    proveedores_bd: Optional[str] = None
    periodicidad: Optional[str] = None
    desc_periodicidad: Optional[str] = None
    tiene_diccionario: Optional[bool] = None
    objetivo_uso: Optional[str] = None
    usuarios_datos: Optional[str] = None
    quienes_son: Optional[str] = None
    historicos: Optional[bool] = None
    desc_historicos: Optional[str] = None
    migracion_actualizacion: Optional[bool] = None
    desc_migracion_actualizacion: Optional[str] = None
    medidas_seguridad: Optional[bool] = None
    desc_medidas_seguridad: Optional[str] = None
    normativas_proteccion: Optional[bool] = None
    desc_normativas_proteccion: Optional[str] = None
    plan_contingencia: Optional[bool] = None
    desc_plan_contingencia: Optional[str] = None
    interoperatividad: Optional[bool] = None
    desc_interoperatividad: Optional[str] = None
    plataforma_difusion: Optional[bool] = None
    nombre_plataforma_difusion: Optional[str] = None
    url_plataforma_difusion: Optional[str] = None
    retos: Optional[str] = None


class BasesDatosCreate(BaseModel):
    nombre_bd: str
    descripcion_bd: str


class BasesDatosUpdate(BasesDatosBase):
    ejes_estrategicos: Optional[List[str]] = Field(default=None)


class BasesDatosResponse(BasesDatosBase):
    id: int
    user_id: int
    ruta_diccionario: Optional[str] = None
    ejes_estrategicos: List[CatalogoEjeEstrategicoResponse] = []

    model_config = ConfigDict(from_attributes=True)
