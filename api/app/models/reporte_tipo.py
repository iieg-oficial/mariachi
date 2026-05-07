from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.core.time import utcnow


class ReporteTipo(Base):
    __tablename__ = "reporte_tipos"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(50), nullable=False, unique=True, index=True)
    label = Column(String(100), nullable=False)
    color = Column(String(20), nullable=False, default="default")
    icon = Column(String(50), nullable=True)
    descripcion = Column(Text, nullable=True)
    form_schema = Column(JSONB, nullable=True)
    activo = Column(Boolean, nullable=False, default=True, index=True)
    orden = Column(Integer, nullable=False, default=0, index=True)
    creado_en = Column(DateTime, nullable=False, default=utcnow)
    actualizado_en = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    reportes = relationship("Reporte", back_populates="tipo_rel", lazy="select")
