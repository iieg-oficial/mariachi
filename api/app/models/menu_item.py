from sqlalchemy import Boolean, Column, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True)
    label = Column(String, nullable=False)
    url = Column(String, nullable=False)
    order = Column(Integer, default=0)
    visible = Column(Boolean, default=True)
    external = Column(Boolean, default=False)
    parent_id = Column(Integer, nullable=True)
    icon = Column(String, nullable=True)
