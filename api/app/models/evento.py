from sqlalchemy import JSON, Boolean, Column, DateTime, Enum, Integer, String, Text

from app.core.database import Base
from app.core.time import utcnow


class Evento(Base):
    __tablename__ = "eventos"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(120), unique=True, nullable=False, index=True)
    titulo = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=True)
    icono_url = Column(Text, nullable=True)
    bbox = Column(JSON, nullable=True)
    capas = Column(JSON, default=list, nullable=False)
    activo = Column(Boolean, nullable=False, default=False)
    fecha_inicio = Column(DateTime, nullable=True)
    fecha_fin = Column(DateTime, nullable=True)
    orden = Column(Integer, nullable=False, default=0)
    estado = Column(
        Enum("draft", "published", name="evento_estado"),
        nullable=False,
        default="draft",
    )
    created_at = Column(DateTime, nullable=False, default=utcnow)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)
    published_at = Column(DateTime, nullable=True)
