from sqlalchemy import Column, DateTime, Integer, String

from app.core.database import Base
from app.core.time import utcnow


class ReporteGrupo(Base):
    __tablename__ = "reporte_grupos"

    id = Column(Integer, primary_key=True, index=True)
    fingerprint = Column(String(64), nullable=False, unique=True, index=True)
    primer_reporte_id = Column(Integer, nullable=True)
    ultimo_reporte_id = Column(Integer, nullable=True)
    count = Column(Integer, nullable=False, default=1, index=True)
    primer_visto = Column(DateTime, nullable=False, default=utcnow)
    ultimo_visto = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)
