from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text

from app.core.database import Base
from app.core.time import utcnow

SCHEMA = "wacha"


class Camara(Base):
    __tablename__ = "camaras"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(20), unique=True, nullable=False, index=True)
    etiqueta = Column(String(200), nullable=False)
    ubicacion = Column(Text, nullable=True)
    rtsp_url = Column(Text, nullable=False)
    habilitada = Column(Boolean, default=True, nullable=False, server_default="true")
    grabacion_habilitada = Column(
        Boolean, default=True, nullable=False, server_default="true"
    )
    retencion_dias = Column(Integer, default=7, nullable=False, server_default="7")
    deteccion_habilitada = Column(
        Boolean, default=False, nullable=False, server_default="false"
    )
    orden = Column(Integer, default=0, nullable=False, server_default="0")
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)
