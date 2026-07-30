from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    false,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.core.database import Base


class MapalabEvent(Base):
    __tablename__ = "events"
    __table_args__ = (
        Index("ix_mapalab_events_ts", text("ts DESC")),
        Index("ix_mapalab_events_name_ts", "event_name", text("ts DESC")),
        Index("ix_mapalab_events_session", "session_id"),
        Index(
            "ix_mapalab_events_layer",
            "layer_id",
            postgresql_where=text("layer_id IS NOT NULL"),
        ),
        Index("ix_mapalab_events_source", "source"),
        Index("ix_mapalab_events_props_gin", "props", postgresql_using="gin"),
        {"schema": "huachicol"},
    )

    id = Column(BigInteger, primary_key=True)
    ts = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    event_name = Column(String(50), nullable=False)
    session_id = Column(UUID(as_uuid=True), nullable=False)
    app = Column(String(40), nullable=False, server_default="mapalab")
    source = Column(String(20), nullable=False, server_default="visor")
    api_key_id = Column(
        Integer,
        ForeignKey("mapalab_api_keys.id", ondelete="SET NULL"),
        nullable=True,
    )
    layer_id = Column(String(120), nullable=True)
    props = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    ua_family = Column(String(40), nullable=True)
    referrer = Column(String(500), nullable=True)
    pathname = Column(String(200), nullable=True)


class MapalabSession(Base):
    __tablename__ = "sessions"
    __table_args__ = (
        Index("ix_mapalab_sessions_started_at", text("started_at DESC")),
        Index("ix_mapalab_sessions_source", "source"),
        Index("ix_mapalab_sessions_last_seen", text("last_seen_at DESC")),
        {"schema": "huachicol"},
    )

    session_id = Column(UUID(as_uuid=True), primary_key=True)
    started_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    last_seen_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    app = Column(String(40), nullable=False, server_default="mapalab")
    source = Column(String(20), nullable=False, server_default="visor")
    api_key_id = Column(
        Integer,
        ForeignKey("mapalab_api_keys.id", ondelete="SET NULL"),
        nullable=True,
    )
    events_count = Column(Integer, nullable=False, server_default="0")
    duration_sec = Column(Integer, nullable=False, server_default="0")
    layers_activated = Column(Integer, nullable=False, server_default="0")
    used_swipe = Column(Boolean, nullable=False, server_default=false())
    used_drawing = Column(Boolean, nullable=False, server_default=false())
    used_measurement = Column(Boolean, nullable=False, server_default=false())
    downloaded = Column(Boolean, nullable=False, server_default=false())
    shared = Column(Boolean, nullable=False, server_default=false())
    reported = Column(Boolean, nullable=False, server_default=false())
    ua_family = Column(String(40), nullable=True)
    referrer = Column(String(500), nullable=True)
    entry_pathname = Column(String(200), nullable=True)
