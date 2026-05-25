from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import relationship

from app.core.database import DataEngineBase
from app.core.time import utcnow

NODE_TYPES = ("tema", "category", "label", "group", "leaf")


class Workspace(DataEngineBase):
    __tablename__ = "workspaces"
    __table_args__ = {"schema": "mapalab"}

    alias = Column(String(50), primary_key=True)
    geoserver_workspace = Column(String(200), nullable=False)
    db_schema = Column(String(200), nullable=False)
    label = Column(String(200))
    created_at = Column(DateTime(timezone=True), server_default=text("NOW()"), nullable=False)


class Layer(DataEngineBase):
    __tablename__ = "layers"
    __table_args__ = (
        CheckConstraint(
            f"node_type IN {NODE_TYPES}",
            name="ck_layers_node_type",
        ),
        CheckConstraint(
            "slug IS NULL OR (slug ~ '^[a-z0-9-]+$' AND length(slug) <= 60)",
            name="ck_layers_slug_format",
        ),
        {"schema": "mapalab"},
    )

    id = Column(String(100), primary_key=True)
    slug = Column(String(60), unique=True, nullable=True)
    parent_id = Column(
        String(100),
        ForeignKey("mapalab.layers.id", ondelete="CASCADE"),
        nullable=True,
    )
    label = Column(String(255), nullable=False)
    sort_order = Column(Integer, server_default="0", nullable=False)
    node_type = Column(String(20), nullable=False)

    hidden_in_menu = Column(Boolean, server_default=text("FALSE"), nullable=False)
    disabled = Column(Boolean, server_default=text("FALSE"), nullable=False)

    workspace_alias = Column(
        String(50),
        ForeignKey("mapalab.workspaces.alias", ondelete="SET NULL"),
        nullable=True,
    )
    geoserver_layer = Column(String(200), nullable=True)
    styles = Column(String(200), server_default="", nullable=False)
    cql_filter = Column(Text, server_default="", nullable=False)
    wms_group = Column(String(100), nullable=True)

    wfs_available = Column(Boolean, server_default=text("TRUE"), nullable=False)
    wfs_layer_name = Column(String(200), nullable=True)
    downloadable = Column(Boolean, server_default=text("TRUE"), nullable=False)

    metadata_layer = Column(String(200), nullable=True)

    default_date = Column(JSONB, nullable=True)
    time_enabled = Column(Boolean, server_default=text("FALSE"), nullable=False)
    time_style_pattern = Column(String(200), nullable=True)
    raster_periodicity = Column(JSONB, nullable=True)
    hide_periodicity = Column(Boolean, server_default=text("FALSE"), nullable=False)

    default_zoom = Column(JSONB, nullable=True)
    zoom_range = Column(JSONB, nullable=True)

    search_tags = Column(ARRAY(Text), nullable=True)
    searchable_fields = Column(ARRAY(Text), nullable=True)
    has_municipio = Column(Boolean, server_default=text("FALSE"), nullable=False)
    has_direccion = Column(Boolean, server_default=text("FALSE"), nullable=False)
    municipio_field = Column(String(100), nullable=True)
    direccion_field = Column(String(100), nullable=True)

    infobox_template = Column(String(50), nullable=True)
    infobox_params = Column(JSONB, nullable=True)
    infobox_config = Column(JSONB, nullable=True)

    icon_url = Column(Text, nullable=True)

    notice = Column(JSONB, nullable=True)
    highlight_color = Column(String(20), nullable=True)
    highlight_shape = Column(String(20), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=text("NOW()"), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=text("NOW()"),
        onupdate=utcnow,
        nullable=False,
    )
    updated_by = Column(String(100), nullable=True)

    deleted_at = Column(DateTime(timezone=True), nullable=True)
    deleted_by = Column(String(100), nullable=True)

    workspace = relationship("Workspace", lazy="joined")
    children = relationship(
        "Layer",
        backref="parent",
        remote_side="Layer.id",
        cascade="all, delete-orphan",
        single_parent=True,
    )
    aliases = relationship(
        "LayerAlias",
        back_populates="layer",
        cascade="all, delete-orphan",
        lazy="select",
    )


class InitialLayerOrder(DataEngineBase):
    __tablename__ = "initial_layer_order"
    __table_args__ = {"schema": "mapalab"}

    layer_id = Column(
        String(100),
        ForeignKey("mapalab.layers.id", ondelete="CASCADE"),
        primary_key=True,
    )
    sort_order = Column(Integer, nullable=False)


class LayerAlias(DataEngineBase):
    __tablename__ = "layer_aliases"
    __table_args__ = (
        CheckConstraint(
            "alias ~ '^[a-z0-9-]+$' AND length(alias) <= 60",
            name="ck_layer_aliases_format",
        ),
        {"schema": "mapalab"},
    )

    alias = Column(String(60), primary_key=True)
    layer_id = Column(
        String(100),
        ForeignKey("mapalab.layers.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_by = Column(String(100), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=text("NOW()"),
        nullable=False,
    )

    layer = relationship("Layer", back_populates="aliases", lazy="joined")
