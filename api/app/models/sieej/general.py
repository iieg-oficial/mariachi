from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.core.time import utcnow

SCHEMA = "sieej"


class General(Base):
    __tablename__ = "general"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    unidad_admin_id = Column(
        Integer,
        ForeignKey(f"{SCHEMA}.catalogo_unidad_admin.id", ondelete="RESTRICT"),
        nullable=True,
    )
    nombre_ente_gobierno = Column(String, nullable=False)
    hay_responsable = Column(Boolean, nullable=False)
    descripcion_hay_responsable = Column(Text, nullable=True)
    desafios_oportunidades = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    unidad_admin = relationship("CatalogoUnidadAdmin", lazy="select")
