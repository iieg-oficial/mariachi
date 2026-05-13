from sqlalchemy import JSON, Column, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.core.time import utcnow


class Borrador(Base):
    __tablename__ = "borradores"

    id = Column(Integer, primary_key=True, index=True)
    resource_type = Column(String, nullable=False)
    resource_id = Column(String, nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    data = Column(JSON, nullable=False)
    estado = Column(String, nullable=False, default='en_progreso')
    comentario_rechazo = Column(Text, nullable=True)
    creado_en = Column(DateTime, default=utcnow)
    actualizado_en = Column(DateTime, default=utcnow, onupdate=utcnow)

    usuario = relationship("Usuario", foreign_keys=[usuario_id], lazy="select")

    __table_args__ = (
        Index(
            "uq_borrador_recurso_usuario_activos",
            "resource_type",
            "resource_id",
            "usuario_id",
            unique=True,
            postgresql_where="estado IN ('en_progreso', 'pendiente_revision', 'rechazado')",
        ),
    )
