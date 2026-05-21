from sqlalchemy import JSON, Boolean, Column, DateTime, Enum, Integer, String, Text

from app.core.database import Base
from app.core.eventos import ENUM_NAME, EventoEstado
from app.core.time import utcnow


class Evento(Base):
    """Evento del visor MapaLab.

    Visibilidad para el visor publico = AND de tres condiciones:
      - estado == 'published'
      - activo == true
      - fecha_inicio IS NULL OR fecha_inicio <= now
      - fecha_fin   IS NULL OR fecha_fin   >= now

    `estado` es el flag de publicacion editorial (workflow draft/published).
    `activo` es un kill-switch independiente: permite ocultar un evento ya
    publicado sin pasar por la transicion despublicar (que reinicia
    `published_at`). Usar `activo` para apagar un evento temporalmente
    durante un incidente; usar `despublicar` para retirarlo definitivamente.
    """

    __tablename__ = "eventos"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(120), unique=True, nullable=False, index=True)
    titulo = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=True)
    icono_url = Column(Text, nullable=True)
    imagen_url = Column(Text, nullable=True)
    bbox = Column(JSON, nullable=True)
    capas = Column(JSON, default=list, nullable=False)
    facts = Column(JSON, default=list, nullable=False)
    fun_icon = Column(String(32), nullable=True)
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
