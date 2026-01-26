from sqlalchemy import Column, Integer, JSON, String

from app.core.database import Base


class Style(Base):
    __tablename__ = "styles"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, nullable=False, index=True)
    config = Column(JSON, default=dict, nullable=False)
