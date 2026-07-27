from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    Index,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB

from app.core.database import Base

ESTADOS = ("pendiente", "aprobada", "rechazada")


class MapalabInfoboxPropuesta(Base):
    __tablename__ = "mapalab_infobox_propuestas"
    __table_args__ = (
        Index(
            "ix_infobox_propuestas_pendientes",
            "capa_slug",
            postgresql_where=text("estado = 'pendiente'"),
        ),
        Index("ix_infobox_propuestas_creado", text("creado_en DESC")),
    )

    id = Column(BigInteger, primary_key=True)
    capa_slug = Column(String(100), nullable=False)
    config = Column(JSONB, nullable=False)
    comentario = Column(Text, nullable=True)
    email = Column(String(255), nullable=True)
    estado = Column(String(20), nullable=False, server_default="pendiente")
    comentario_revision = Column(Text, nullable=True)
    revisado_por = Column(String(255), nullable=True)
    revisado_en = Column(DateTime(timezone=True), nullable=True)
    ip_hash = Column(String(64), nullable=True)
    creado_en = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
