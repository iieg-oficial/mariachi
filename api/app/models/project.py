from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.core.time import utcnow


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    memberships = relationship("UserProject", back_populates="project", cascade="all, delete-orphan")
    buckets = relationship("AcervoBucket", back_populates="project", cascade="all, delete-orphan")


class UserProject(Base):
    __tablename__ = "user_projects"

    user_id = Column(
        Integer,
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        primary_key=True,
    )
    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        primary_key=True,
    )
    project_role = Column(
        Enum("editor", "viewer", name="project_roles"),
        nullable=False,
    )

    project = relationship("Project", back_populates="memberships")
