from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.core.time import utcnow


class MediaBucket(Base):
    __tablename__ = "media_buckets"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    acervo_bucket = Column(String(100), unique=True, nullable=False)
    access_key_ref = Column(String(100), nullable=False)
    display_name = Column(String(200), nullable=False)
    is_public = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    project = relationship("Project", back_populates="buckets")
