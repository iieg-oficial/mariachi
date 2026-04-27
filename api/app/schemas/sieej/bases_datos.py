from pydantic import BaseModel, ConfigDict, Field


class CatalogoEjeEstrategicoResponse(BaseModel):
    id: int
    value: str

    model_config = ConfigDict(from_attributes=True)


class BasesDatosBase(BaseModel):
    nombre_bd: str
    descripcion_bd: str
    categoria_datos: str | None = None
    herramientas_gestion: str | None = None
    calidad_datos: str | None = None
    limpieza_validacion: bool | None = None
    desc_limpieza_validacion: str | None = None
    proveedores_bd: str | None = None
    periodicidad: str | None = None
    desc_periodicidad: str | None = None
    tiene_diccionario: bool | None = None
    objetivo_uso: str | None = None
    usuarios_datos: str | None = None
    quienes_son: str | None = None
    historicos: bool | None = None
    desc_historicos: str | None = None
    migracion_actualizacion: bool | None = None
    desc_migracion_actualizacion: str | None = None
    medidas_seguridad: bool | None = None
    desc_medidas_seguridad: str | None = None
    normativas_proteccion: bool | None = None
    desc_normativas_proteccion: str | None = None
    plan_contingencia: bool | None = None
    desc_plan_contingencia: str | None = None
    interoperatividad: bool | None = None
    desc_interoperatividad: str | None = None
    plataforma_difusion: bool | None = None
    nombre_plataforma_difusion: str | None = None
    url_plataforma_difusion: str | None = None
    retos: str | None = None


class BasesDatosCreate(BaseModel):
    nombre_bd: str
    descripcion_bd: str


class BasesDatosUpdate(BasesDatosBase):
    ejes_estrategicos: list[str] | None = Field(default=None)


class BasesDatosResponse(BasesDatosBase):
    id: int
    user_id: int
    ruta_diccionario: str | None = None
    ejes_estrategicos: list[CatalogoEjeEstrategicoResponse] = []

    model_config = ConfigDict(from_attributes=True)
