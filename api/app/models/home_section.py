from sqlalchemy import JSON, Column, DateTime, String

from app.core.database import Base
from app.core.time import utcnow


HOME_SECTION_KEYS = ("banner", "topics", "guide", "select", "faq", "video", "footer")


class HomeSection(Base):
    __tablename__ = "home_sections"

    key = Column(String(40), primary_key=True)
    payload_published = Column(JSON, nullable=False, default=dict)
    payload_draft = Column(JSON, nullable=False, default=dict)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)
    published_at = Column(DateTime, nullable=True)
