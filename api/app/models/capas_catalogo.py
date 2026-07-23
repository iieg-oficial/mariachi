from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import ARRAY

from app.core.database import DataEngineBase
from app.core.time import utcnow


class CapaCatalogo(DataEngineBase):
    __tablename__ = "catalogo_capas"
    __table_args__ = {"schema": "mapalab"}

    id = Column(Integer, primary_key=True)
    slug = Column(String(100), nullable=False)
    nombre = Column(String(255), nullable=False)
    workspace_alias = Column(String(100), nullable=False)
    geoserver_layer = Column(String(255), nullable=False)
    search_tags = Column(ARRAY(Text), nullable=True)
    enabled = Column(Boolean, server_default=text("TRUE"), nullable=False)
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
