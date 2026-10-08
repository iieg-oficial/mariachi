from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text

from app.core.database import Base
from app.core.time import utcnow

TIPOS_HITO = (
    "mayor",
    "lanzamiento",
    "joven",
    "feature",
    "momento",
    "muerto",
    "legacy",
    "porllegar",
)


class RoadmapHito(Base):
    __tablename__ = "roadmap_hitos"

    id = Column(Integer, primary_key=True, index=True)
    clave = Column(String(60), unique=True, nullable=False, index=True)
    etiqueta = Column(String(120), nullable=False)
    proyecto = Column(String(40), nullable=False, index=True)
    tipo = Column(String(20), nullable=False)
    fecha_eje = Column(String(10), nullable=False)
    fecha_texto = Column(String(80), nullable=False)
    motivo = Column(Text, nullable=False)
    nombre_anterior = Column(String(60), nullable=True)
    feature_de = Column(String(40), nullable=True)
    nace_de = Column(String(60), nullable=True)
    leyenda = Column(String(60), nullable=True)
    beta = Column(Boolean, default=False, nullable=False, server_default="false")
    muerto = Column(Boolean, default=False, nullable=False, server_default="false")
    orden = Column(Integer, default=0, nullable=False, server_default="0")
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)
