from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB

from app.core.database import Base
from app.core.time import utcnow


class ColibriRoute(Base):
    __tablename__ = "colibri_routes"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    source_app_id = Column(
        Integer, ForeignKey("source_apps.id"), nullable=True, index=True
    )
    tipo_id = Column(
        Integer, ForeignKey("reporte_tipos.id"), nullable=True, index=True
    )
    destino = Column(String(40), nullable=False, index=True)
    config = Column(JSONB, nullable=False, default=dict)
    filtros = Column(JSONB, nullable=True)
    activo = Column(Boolean, nullable=False, default=True, index=True)
    orden = Column(Integer, nullable=False, default=0, index=True)
    creado_en = Column(DateTime, nullable=False, default=utcnow)
    actualizado_en = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)
