from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Index, Integer, String, Text

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


class PersonaFicha(Base):
    __tablename__ = "personas_ficha"
    __table_args__ = {"schema": SCHEMA}

    pin = Column(String(30), ForeignKey(f"{SCHEMA}.personas.pin", ondelete="CASCADE"), primary_key=True)
    nombre = Column(String(150), nullable=True)
    apellidos = Column(String(150), nullable=True)
    email = Column(String(255), nullable=True)
    telefono = Column(String(50), nullable=True)
    departamento = Column(String(150), nullable=True)
    vinculo = Column(String(80), nullable=True)
    puesto = Column(String(150), nullable=True)
    horario = Column(String(10), nullable=True)
    cumpleanos = Column(Date, nullable=True)
    fecha_ingreso = Column(Date, nullable=True)
    foto_url = Column(Text, nullable=True)
    activo = Column(Boolean, nullable=True)
    notas = Column(Text, nullable=True)
    actualizado_at = Column(DateTime, default=utcnow, nullable=False)
    actualizado_por = Column(String(150), nullable=True)
