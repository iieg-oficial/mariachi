from sqlalchemy import Column, DateTime, Index, Integer, String

from app.core.database import Base
from app.core.time import utcnow

SCHEMA = "vine"


class Persona(Base):
    __tablename__ = "personas"
    __table_args__ = {"schema": SCHEMA}

    pin = Column(String(30), primary_key=True)
    nombre = Column(String(150), nullable=False)
    apellidos = Column(String(150), nullable=True)
    email = Column(String(255), nullable=True)
    departamento = Column(String(150), nullable=True)
    puesto = Column(String(150), nullable=True)
    sincronizado_at = Column(DateTime, default=utcnow, nullable=False)


class Evento(Base):
    __tablename__ = "eventos"
    __table_args__ = (
        Index("ix_vine_eventos_pin_time", "pin", "event_time"),
        {"schema": SCHEMA},
    )

    id = Column(Integer, primary_key=True, autoincrement=False)
    pin = Column(String(30), nullable=False, index=True)
    event_time = Column(DateTime, nullable=False, index=True)
    direccion = Column(String(8), nullable=True, index=True)
    punto = Column(String(100), nullable=True)
    lector = Column(String(100), nullable=True)
    evento = Column(String(120), nullable=True)
    verificacion = Column(String(60), nullable=True)
    dispositivo = Column(String(100), nullable=True)
    sincronizado_at = Column(DateTime, default=utcnow, nullable=False)
