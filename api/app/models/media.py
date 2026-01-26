from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class MediaFolder(Base):
    __tablename__ = "media_folders"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    path = Column(String, unique=True, nullable=False, index=True)
    parent = Column(String, nullable=True)

    media = relationship("Media", back_populates="folder_rel")


class Media(Base):
    __tablename__ = "media"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    original_name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    size = Column(Integer, nullable=False)
    url = Column(String, nullable=False)
    thumbnail = Column(String, nullable=True)
    folder = Column(String, ForeignKey("media_folders.path"), default="/", nullable=False, index=True)
    uploaded_by = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    metadata_json = Column("metadata", JSON, default=dict)

    uploaded_by_user = relationship("Usuario", back_populates="media_uploads")
    folder_rel = relationship("MediaFolder", back_populates="media", foreign_keys=[folder])
