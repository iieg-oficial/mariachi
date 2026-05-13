from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    text,
)
from sqlalchemy.orm import relationship

from app.core.database import DataEngineBase
from app.core.time import utcnow

SYMBOL_KINDS = ("emoji", "svg", "image")


class SymbolCategory(DataEngineBase):
    __tablename__ = "symbol_categories"
    __table_args__ = {"schema": "mapalab"}

    id = Column(Integer, primary_key=True)
    slug = Column(String(100), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    icon = Column(Text, nullable=True)
    sort_order = Column(Integer, server_default="0", nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=text("NOW()"),
        onupdate=utcnow,
        nullable=False,
    )

    symbols = relationship(
        "Symbol",
        back_populates="category",
        cascade="all, delete-orphan",
        order_by="Symbol.sort_order",
        lazy="select",
    )


class Symbol(DataEngineBase):
    __tablename__ = "symbols"
    __table_args__ = (
        CheckConstraint(
            f"kind IN {SYMBOL_KINDS}",
            name="ck_symbols_kind",
        ),
        Index("ix_symbols_category_sort", "category_id", "sort_order"),
        {"schema": "mapalab"},
    )

    id = Column(Integer, primary_key=True)
    category_id = Column(
        Integer,
        ForeignKey("mapalab.symbol_categories.id", ondelete="CASCADE"),
        nullable=False,
    )
    kind = Column(String(16), nullable=False)
    value = Column(Text, nullable=True)
    name = Column(String(200), nullable=True)
    sort_order = Column(Integer, server_default="0", nullable=False)
    image_object_key = Column(Text, nullable=True)
    png_object_key = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=text("NOW()"),
        onupdate=utcnow,
        nullable=False,
    )

    category = relationship("SymbolCategory", back_populates="symbols", lazy="joined")
