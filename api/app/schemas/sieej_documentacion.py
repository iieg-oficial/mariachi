from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

TipoSeccion = Literal[
    "descripcion", "fuente", "tablas", "vistas", "ejecucion", "variables", "diagrama", "texto"
]

TIPOS_SECCION: tuple[str, ...] = (
    "descripcion", "fuente", "tablas", "vistas", "ejecucion", "variables", "diagrama", "texto"
)

TITULOS_POR_TIPO: dict[str, str] = {
    "descripcion": "Descripción",
    "fuente": "Fuente de datos",
    "tablas": "Tablas",
    "vistas": "Vistas",
    "ejecucion": "Ejecución en Airflow",
    "variables": "Variables de entorno",
    "diagrama": "Diagrama entidad-relación",
    "texto": "Nota",
}


class Par(BaseModel):
    etiqueta: str = Field(..., max_length=200)
    valor: str = Field(..., max_length=4000)


class Descarga(BaseModel):
    variable: str = Field(..., max_length=120)
    url: str = Field(..., max_length=1000)


class ContenidoDescripcion(BaseModel):
    parrafos: list[str] = Field(default_factory=list)
    avisos: list[str] = Field(default_factory=list)


class ContenidoFuente(BaseModel):
    caracteristicas: list[Par] = Field(default_factory=list)
    fuente_general: str | None = None
    descargas: list[Descarga] = Field(default_factory=list)


class ContenidoNotas(BaseModel):
    notas: dict[str, str] = Field(default_factory=dict)


class ContenidoEjecucion(BaseModel):
    nota: str | None = None


class ContenidoVariables(BaseModel):
    variables: list[Par] = Field(default_factory=list)


class ContenidoDiagrama(BaseModel):
    origen: Literal["auto", "bd", "repo"] = "auto"


class ContenidoTexto(BaseModel):
    markdown: str = Field(default="", max_length=20000)


CONTENIDO_POR_TIPO: dict[str, type[BaseModel]] = {
    "descripcion": ContenidoDescripcion,
    "fuente": ContenidoFuente,
    "tablas": ContenidoNotas,
    "vistas": ContenidoNotas,
    "ejecucion": ContenidoEjecucion,
    "variables": ContenidoVariables,
    "diagrama": ContenidoDiagrama,
    "texto": ContenidoTexto,
}


class Seccion(BaseModel):
    id: str = Field(..., min_length=1, max_length=40)
    tipo: TipoSeccion
    titulo: str = Field(..., min_length=1, max_length=200)
    visible: bool = True
    origen: Literal["readme", "manual"] = "manual"
    editada: bool = False
    readme_commit: str | None = None
    contenido: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def _validar_contenido(self) -> "Seccion":
        modelo = CONTENIDO_POR_TIPO[self.tipo]
        self.contenido = modelo.model_validate(self.contenido).model_dump()
        return self


class ContenidoPagina(BaseModel):
    titulo: str = Field(..., min_length=1, max_length=200)
    producto: str = Field(default="", max_length=300)
    secciones: list[Seccion] = Field(default_factory=list)

    @model_validator(mode="after")
    def _ids_unicos(self) -> "ContenidoPagina":
        ids = [s.id for s in self.secciones]
        if len(ids) != len(set(ids)):
            raise ValueError("Hay secciones con el mismo id")
        return self


class PipelineNuevo(BaseModel):
    clave: str = Field(min_length=2, max_length=80, pattern=r"^[a-z0-9_]+$")
    titulo: str = Field(min_length=1, max_length=200)
    producto: str = Field(default="", max_length=300)


class AjustesPipeline(BaseModel):
    visible: bool | None = None
    orden: int | None = None


class PipelineResumen(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    clave: str
    titulo: str
    producto: str
    estado: str
    visible: bool
    manual: bool = False
    orden: int
    fuentes_detectadas: list[str]
    clasificacion: str | None
    borrador_pendiente: bool
    secciones_con_readme_nuevo: int
    detectado_en: datetime
    publicado_en: datetime | None
    actualizado_en: datetime
    actualizado_por: str | None
    sincronizado_en: datetime | None
    visitas_30_dias: int = 0


class PipelineDetalle(PipelineResumen):
    borrador: ContenidoPagina
    publicado: ContenidoPagina | None
    medicion: dict[str, Any] | None
    readme: dict[str, Any] | None
    readme_commit: str | None


class SeccionPublica(BaseModel):
    id: str
    tipo: str
    titulo: str
    contenido: dict[str, Any]


class PipelinePublico(BaseModel):
    clave: str
    titulo: str
    producto: str
    estado: str
    clasificacion: str | None
    secciones: list[SeccionPublica]
    base: dict[str, Any] | None
    origen_base: str | None
    corte_respaldo: str | None
    etapas: list[dict[str, Any]]
    der_svg: str | None
    publicado_en: datetime | None
    sincronizado_en: datetime | None


class PipelinePublicoResumen(BaseModel):
    clave: str
    titulo: str
    producto: str
    estado: str
    clasificacion: str | None
    etapas: list[dict[str, Any]]
    vistas_en_bd: int | None
    vistas_documentadas: int
    tiene_base: bool


class PipelineSyncIn(BaseModel):
    clave: str = Field(..., min_length=1, max_length=80)
    carpeta_etl: str | None = Field(default=None, max_length=120)
    fuentes_detectadas: list[Literal["bd", "readme", "airflow", "carpeta"]] = Field(
        default_factory=list
    )
    titulo: str = Field(..., min_length=1, max_length=200)
    producto: str = Field(default="", max_length=300)
    clasificacion: str | None = Field(default=None, max_length=40)
    readme: dict[str, Any] | None = None
    readme_commit: str | None = Field(default=None, max_length=40)
    base: dict[str, Any] | None = None
    origen_base: Literal["bd", "respaldo"] | None = None
    corte_respaldo: str | None = Field(default=None, max_length=60)
    etapas: list[dict[str, Any]] = Field(default_factory=list)
    der_svg: str | None = None


class SyncIn(BaseModel):
    iniciado_en: datetime
    version: str | None = Field(default=None, max_length=40)
    fuentes: dict[str, dict[str, Any]] = Field(default_factory=dict)
    errores: list[str] = Field(default_factory=list)
    pipelines: list[PipelineSyncIn] = Field(default_factory=list, max_length=500)


class SyncResultado(BaseModel):
    estado: str
    nuevos: list[str]
    actualizados: int
    retirados: list[str]


class Sincronizacion(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    iniciado_en: datetime
    terminado_en: datetime
    duracion_ms: int
    estado: str
    fuentes: dict[str, Any]
    nuevos: list[str]
    actualizados: int
    errores: list[str]
    version: str | None


class Salud(BaseModel):
    estado: Literal["ok", "atrasada", "sin_sincronizar"]
    ultima_sincronizacion: datetime | None
    horas_desde_ultima: float | None
    estado_ultima: str | None
    pipelines_publicados: int
