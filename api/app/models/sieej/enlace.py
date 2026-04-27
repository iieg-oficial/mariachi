from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String

from app.core.database import Base
from app.core.time import utcnow

SCHEMA = "sieej"


class Enlace(Base):
    __tablename__ = "enlace"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)

    nombres = Column(String, nullable=False)
    apellido1 = Column(String, nullable=False)
    apellido2 = Column(String, nullable=False)
    direccion = Column(String, nullable=False)
    puesto = Column(String, nullable=False)
    email = Column(String, nullable=False)
    extension = Column(String, nullable=True)
    telefono = Column(String, nullable=False)
    es_tecnico = Column(Boolean, nullable=False)

    nombres_jefe = Column(String, nullable=False)
    apellido1_jefe = Column(String, nullable=False)
    apellido2_jefe = Column(String, nullable=False)
    puesto_jefe = Column(String, nullable=False)
    email_jefe = Column(String, nullable=False)

    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)
