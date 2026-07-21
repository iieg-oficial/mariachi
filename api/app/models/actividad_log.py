from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB

from app.core.database import Base


class ActividadLog(Base):
    __tablename__ = "actividad"
    __table_args__ = {"schema": "huachicol"}

    id = Column(BigInteger, primary_key=True, index=True)
    actor_id = Column(
        Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True
    )
    actor_role = Column(String(32), nullable=True)
    action = Column(String(128), nullable=False)
    resource_type = Column(String(64), nullable=True)
    resource_id = Column(String(128), nullable=True)
    log_metadata = Column("metadata", JSONB, nullable=False, default=dict, server_default="{}")
    ip = Column(String(64), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
