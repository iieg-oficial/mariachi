from sqlalchemy import Column, Date, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.core.time import utcnow


class MapalabApiKeyAcceso(Base):
    __tablename__ = "mapalab_api_keys_accesos"
    __table_args__ = (
        Index("ix_mapalab_api_keys_accesos_key_ts", "api_key_id", "timestamp"),
        Index("ix_mapalab_api_keys_accesos_dia", "dia"),
        Index("ix_mapalab_api_keys_accesos_origin", "origin"),
        Index("ix_mapalab_api_keys_accesos_key_prefix", "key_prefix"),
    )

    id = Column(Integer, primary_key=True, index=True)
    api_key_id = Column(
        Integer,
        ForeignKey("mapalab_api_keys.id", ondelete="CASCADE"),
        nullable=True,
    )
    key_prefix = Column(String(20), nullable=True)
    timestamp = Column(DateTime, nullable=False, default=utcnow, index=True)
    dia = Column(Date, nullable=False)
    endpoint = Column(String(20), nullable=False)
    resultado = Column(String(20), nullable=False, index=True)
    motivo = Column(String(120), nullable=True)
    origin = Column(String(255), nullable=True)
    ip_hash = Column(String(64), nullable=True)
    layers = Column(JSONB, nullable=False, default=list)
    request_id = Column(String(40), nullable=True)
    clasificacion = Column(String(20), nullable=True)
    sla_estado = Column(String(20), nullable=True)
    linaje_ref = Column(JSONB, nullable=True)

    api_key = relationship("MapalabApiKey")
