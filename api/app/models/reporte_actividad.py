from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.core.time import utcnow


class ReporteActividad(Base):
    __tablename__ = "reporte_actividad"

    id = Column(Integer, primary_key=True, index=True)
    reporte_id = Column(
        Integer, ForeignKey("reportes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    actor_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    accion = Column(String(50), nullable=False, index=True)
    detalle = Column(JSONB, nullable=True)
    nota = Column(Text, nullable=True)
    creado_en = Column(DateTime, nullable=False, default=utcnow, index=True)

    actor = relationship("Usuario", foreign_keys=[actor_id], lazy="select")
