from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.core.time import utcnow


class DireccionOrganizacional(Base):
    __tablename__ = "direcciones_organizacionales"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False)
    siglas = Column(String(20), nullable=True, index=True)
    descripcion = Column(Text, nullable=True)
    email_contacto = Column(String(320), nullable=True)
    responsable_nombre = Column(String(200), nullable=True)
    activo = Column(Boolean, nullable=False, default=True, index=True)
    orden = Column(Integer, nullable=False, default=0, index=True)
    creado_en = Column(DateTime, nullable=False, default=utcnow)
    actualizado_en = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    reportes = relationship("Reporte", back_populates="direccion", lazy="select")
