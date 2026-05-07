from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.core.time import utcnow


class SourceApp(Base):
    __tablename__ = "source_apps"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(50), nullable=False, unique=True, index=True)
    nombre = Column(String(150), nullable=False)
    descripcion = Column(Text, nullable=True)
    api_key_hash = Column(String(255), nullable=True)
    api_key_prefix = Column(String(20), nullable=True, index=True)
    dominios_permitidos = Column(JSONB, nullable=False, default=list)
    tipos_permitidos = Column(JSONB, nullable=True)
    rate_limit_per_hour = Column(Integer, nullable=False, default=60)
    branding = Column(JSONB, nullable=True)
    notificar_discord = Column(Boolean, nullable=False, default=True)
    discord_webhook_url = Column(String(500), nullable=True)
    disable_pii = Column(Boolean, nullable=False, default=False)
    privacy_url = Column(String(500), nullable=True)
    scrubbers = Column(JSONB, nullable=True)
    activo = Column(Boolean, nullable=False, default=True, index=True)
    creado_en = Column(DateTime, nullable=False, default=utcnow)
    actualizado_en = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    reportes = relationship("Reporte", back_populates="source_app_rel", lazy="select")
