from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)

from app.core.database import Base
from app.core.time import utcnow

SCHEMA = "sieej_documentacion"


class PipelineDoc(Base):
    __tablename__ = "pipelines"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True)
    clave = Column(String(80), nullable=False, unique=True)
    carpeta_etl = Column(String(120), nullable=True)
    estado = Column(String(20), nullable=False, default="nuevo")
    fuentes_detectadas = Column(JSON, nullable=False, default=list)
    orden = Column(Integer, nullable=False, default=0)
    visible = Column(Boolean, nullable=False, default=True)
    manual = Column(Boolean, nullable=False, default=False)
    contenido_borrador = Column(JSON, nullable=False, default=dict)
    contenido_publicado = Column(JSON, nullable=True)
    detectado_en = Column(DateTime, nullable=False, default=utcnow)
    publicado_en = Column(DateTime, nullable=True)
    actualizado_en = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)
    actualizado_por = Column(String(120), nullable=True)


class MedicionDoc(Base):
    __tablename__ = "mediciones"
    __table_args__ = {"schema": SCHEMA}

    pipeline_id = Column(
        Integer, ForeignKey(f"{SCHEMA}.pipelines.id", ondelete="CASCADE"), primary_key=True
    )
    clasificacion = Column(String(40), nullable=True)
    base = Column(JSON, nullable=True)
    origen_base = Column(String(20), nullable=True)
    corte_respaldo = Column(String(60), nullable=True)
    etapas = Column(JSON, nullable=False, default=list)
    der_svg = Column(Text, nullable=True)
    sincronizado_en = Column(DateTime, nullable=False, default=utcnow)


class ReadmeDoc(Base):
    __tablename__ = "readmes"
    __table_args__ = {"schema": SCHEMA}

    pipeline_id = Column(
        Integer, ForeignKey(f"{SCHEMA}.pipelines.id", ondelete="CASCADE"), primary_key=True
    )
    contenido = Column(JSON, nullable=False, default=dict)
    commit = Column(String(40), nullable=True)
    sincronizado_en = Column(DateTime, nullable=False, default=utcnow)


class SincronizacionDoc(Base):
    __tablename__ = "sincronizaciones"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True)
    iniciado_en = Column(DateTime, nullable=False)
    terminado_en = Column(DateTime, nullable=False, default=utcnow)
    duracion_ms = Column(Integer, nullable=False, default=0)
    estado = Column(String(20), nullable=False)
    fuentes = Column(JSON, nullable=False, default=dict)
    nuevos = Column(JSON, nullable=False, default=list)
    actualizados = Column(Integer, nullable=False, default=0)
    errores = Column(JSON, nullable=False, default=list)
    version = Column(String(40), nullable=True)
