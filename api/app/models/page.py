from sqlalchemy import JSON, Column, DateTime, Integer, String, Text

from app.core.database import Base
from app.core.time import utcnow


class Page(Base):
    __tablename__ = "pages"

    id = Column(Integer, primary_key=True, index=True)
    menu_item_id = Column(String, unique=True, nullable=False, index=True)
    title = Column(String, nullable=False)
    slug = Column(String, nullable=False)
    sections = Column(JSON, default=list, nullable=False)
    meta_description = Column(Text, nullable=True)
    meta_keywords = Column(String, nullable=True)
    published_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
