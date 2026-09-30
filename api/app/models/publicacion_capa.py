from sqlalchemy import JSON, Column, DateTime, ForeignKey, Index, Integer, String

from app.core.database import Base
from app.core.time import utcnow


class PublicacionCapa(Base):
    __tablename__ = "publicaciones_capas"

    id = Column(Integer, primary_key=True, index=True)
    resource_type = Column(String(30), nullable=False)
    resource_id = Column(String(300), nullable=False)
    antes = Column(JSON, nullable=False)
    despues = Column(JSON, nullable=False)
    usuario = Column(String(150), nullable=True)
    origen = Column(String(20), nullable=False, default='editor')
    deshace_id = Column(Integer, ForeignKey("publicaciones_capas.id"), nullable=True)
    deshecha_en = Column(DateTime, nullable=True)
    deshecha_por = Column(String(150), nullable=True)
    creado_en = Column(DateTime, nullable=False, default=utcnow)

    __table_args__ = (
        Index("ix_publicaciones_capas_recurso", "resource_type", "resource_id", "creado_en"),
    )
