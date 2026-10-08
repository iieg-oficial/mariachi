from sqlalchemy import JSON, Column, DateTime, ForeignKey, Index, Integer, String, Text, text
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.core.time import utcnow

TIPOS_COMPARTIDOS = ('layer', 'layer_metadata', 'layer_stats')

_ACTIVOS = "estado IN ('en_progreso', 'pendiente_revision', 'rechazado')"
_COMPARTIDOS = "resource_type IN ('layer', 'layer_metadata', 'layer_stats')"
_POR_USUARIO_WHERE = f"{_ACTIVOS} AND resource_type NOT IN ('layer', 'layer_metadata', 'layer_stats')"
_COMPARTIDO_WHERE = f"{_ACTIVOS} AND {_COMPARTIDOS}"


class Borrador(Base):
    __tablename__ = "borradores"

    id = Column(Integer, primary_key=True, index=True)
    resource_type = Column(String, nullable=False)
    resource_id = Column(String, nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    data = Column(JSON, nullable=False)
    estado = Column(String, nullable=False, default='en_progreso')
    comentario_rechazo = Column(Text, nullable=True)
    version = Column(Integer, nullable=False, default=1, server_default=text('1'))
    autores = Column(JSON, nullable=True)
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
            postgresql_where=text(_POR_USUARIO_WHERE),
            sqlite_where=text(_POR_USUARIO_WHERE),
        ),
        Index(
            "uq_borrador_recurso_compartido_activos",
            "resource_type",
            "resource_id",
            unique=True,
            postgresql_where=text(_COMPARTIDO_WHERE),
            sqlite_where=text(_COMPARTIDO_WHERE),
        ),
    )
