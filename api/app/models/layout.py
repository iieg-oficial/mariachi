from sqlalchemy import Column, Integer, JSON, String

from app.core.database import Base


class Layout(Base):
    __tablename__ = "layouts"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, unique=True, nullable=False, index=True)
    config = Column(JSON, default=dict, nullable=False)
