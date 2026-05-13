from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.core.time import utcnow


class MapalabApiKey(Base):
    __tablename__ = "mapalab_api_keys"

    id = Column(Integer, primary_key=True, index=True)
    institucion_nombre = Column(String(150), nullable=False)
    institucion_email_contacto = Column(String(255), nullable=True)
    descripcion = Column(Text, nullable=True)

    visibility = Column(String(20), nullable=False, default="public", index=True)
    key_prefix = Column(String(20), nullable=False, unique=True, index=True)
    key_hash = Column(String(255), nullable=False)

    dominios_permitidos = Column(JSONB, nullable=False, default=list)
    ips_permitidas = Column(JSONB, nullable=False, default=list)
    capas_permitidas = Column(JSONB, nullable=False, default=list)

    cuota_diaria = Column(Integer, nullable=True)
    cuota_mensual = Column(Integer, nullable=True)

    estado = Column(String(20), nullable=False, default="active", index=True)
    expira_en = Column(DateTime, nullable=True, index=True)
    notas_admin = Column(Text, nullable=True)

    creado_por_user_id = Column(
        Integer,
        ForeignKey("usuarios.id", ondelete="SET NULL"),
        nullable=True,
    )
    creado_en = Column(DateTime, nullable=False, default=utcnow)
    actualizado_en = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)
    usado_en = Column(DateTime, nullable=True)

    eventos = relationship(
        "MapalabApiKeyEvento",
        back_populates="api_key",
        cascade="all, delete-orphan",
        lazy="select",
    )
    uso_diario = relationship(
        "MapalabApiKeyUsoDiario",
        back_populates="api_key",
        cascade="all, delete-orphan",
        lazy="select",
    )
    embeds = relationship(
        "MapalabApiKeyEmbed",
        back_populates="api_key",
        cascade="all, delete-orphan",
        lazy="select",
    )
