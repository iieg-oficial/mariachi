from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text

from app.core.database import Base
from app.core.time import utcnow


class RoadmapCiclo(Base):
    __tablename__ = "roadmap_ciclos"

    id = Column(Integer, primary_key=True, index=True)
    clave = Column(String(60), unique=True, nullable=False, index=True)
    nombre = Column(String(120), nullable=False)
    nota = Column(String(120), nullable=False, default="")
    motivo = Column(Text, nullable=False, default="")
    color = Column(String(9), nullable=False)
    x0 = Column(Float, nullable=False)
    x1 = Column(Float, nullable=False)
    y0 = Column(Float, nullable=True)
    y1 = Column(Float, nullable=True)
    orden = Column(Integer, default=0, nullable=False, server_default="0")
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)


class RoadmapProceso(Base):
    __tablename__ = "roadmap_procesos"

    id = Column(Integer, primary_key=True, index=True)
    clave = Column(String(60), unique=True, nullable=False, index=True)
    etiqueta = Column(String(120), nullable=False)
    proyecto = Column(String(40), nullable=False)
    desde = Column(String(10), nullable=False)
    cada = Column(String(5), nullable=False)
    fecha_texto = Column(String(80), nullable=False)
    motivo = Column(Text, nullable=False)
    activo = Column(Boolean, default=True, nullable=False, server_default="true")
    orden = Column(Integer, default=0, nullable=False, server_default="0")
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)
