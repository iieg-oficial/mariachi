from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import relationship

from app.core.database import DataEngineBase
from app.core.time import utcnow


class InstitucionCatalogo(DataEngineBase):
    __tablename__ = "catalogo_instituciones"
    __table_args__ = {"schema": "mapalab"}

    id = Column(Integer, primary_key=True)
    slug = Column(String(100), nullable=False)
    nombre = Column(String(255), nullable=False)
    logo_url = Column(String(500), nullable=True)
    orden = Column(Integer, server_default=text("0"), nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=text("NOW()"), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=text("NOW()"),
        onupdate=utcnow,
        nullable=False,
    )
    updated_by = Column(String(255), nullable=True)


class CapaCatalogo(DataEngineBase):
    __tablename__ = "catalogo_capas"
    __table_args__ = {"schema": "mapalab"}

    id = Column(Integer, primary_key=True)
    slug = Column(String(100), nullable=False)
    nombre = Column(String(255), nullable=False)
    workspace_alias = Column(String(100), nullable=False)
    geoserver_layer = Column(String(255), nullable=False)
    search_tags = Column(ARRAY(Text), nullable=True)
    infobox_config = Column(JSONB, nullable=True)
    enabled = Column(Boolean, server_default=text("TRUE"), nullable=False)
    orden = Column(Integer, server_default=text("0"), nullable=False)
    institucion_id = Column(
        Integer,
        ForeignKey("mapalab.catalogo_instituciones.id", ondelete="SET NULL"),
        nullable=True,
    )
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=text("NOW()"), nullable=False
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=text("NOW()"),
        onupdate=utcnow,
        nullable=False,
    )
    updated_by = Column(String(255), nullable=True)

    institucion = relationship("InstitucionCatalogo", lazy="joined")
