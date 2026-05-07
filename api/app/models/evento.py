from sqlalchemy import JSON, Boolean, Column, DateTime, Enum, Integer, String, Text

from app.core.database import Base
from app.core.eventos import ENUM_NAME, EventoEstado
from app.core.time import utcnow


class Evento(Base):
    __tablename__ = "eventos"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(120), unique=True, nullable=False, index=True)
    titulo = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=True)
    icono_url = Column(Text, nullable=True)
    imagen_url = Column(Text, nullable=True)
    bbox = Column(JSON, nullable=True)
    capas = Column(JSON, default=list, nullable=False)
    activo = Column(Boolean, nullable=False, default=False)
    fecha_inicio = Column(DateTime(timezone=True), nullable=True)
    fecha_fin = Column(DateTime(timezone=True), nullable=True)
    orden = Column(Integer, nullable=False, default=0)
    estado = Column(
        Enum(*EventoEstado.values(), name=ENUM_NAME),
        nullable=False,
        default=EventoEstado.DRAFT.value,
    )
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)
    published_at = Column(DateTime(timezone=True), nullable=True)
