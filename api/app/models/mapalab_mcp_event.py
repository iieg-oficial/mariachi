from sqlalchemy import Column, Date, DateTime, Index, Integer, String

from app.core.database import Base
from app.core.time import utcnow


class MapalabMcpEvent(Base):
    __tablename__ = "mcp_events"
    __table_args__ = (
        Index("ix_mapalab_mcp_events_ts", "timestamp"),
        Index("ix_mapalab_mcp_events_tool_ts", "tool", "timestamp"),
        Index("ix_mapalab_mcp_events_dia", "dia"),
        Index("ix_mapalab_mcp_events_method_ts", "method", "timestamp"),
        {"schema": "huachicol"},
    )

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, nullable=False, default=utcnow)
    dia = Column(Date, nullable=False)
    app = Column(String(40), nullable=False, server_default="mapalab")
    method = Column(String(40), nullable=False)
    tool = Column(String(80), nullable=True)
    status = Column(String(20), nullable=False)
    error_code = Column(Integer, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    bytes_out = Column(Integer, nullable=True)
    session_hash = Column(String(64), nullable=True)
    ip_hash = Column(String(64), nullable=True)
    client_name = Column(String(80), nullable=True)
    client_version = Column(String(40), nullable=True)
