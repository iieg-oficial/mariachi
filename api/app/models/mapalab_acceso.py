from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, Integer, String, text

from app.core.database import DataEngineBase


class MapalabUsuario(DataEngineBase):
    __tablename__ = "usuarios"
    __table_args__ = {"schema": "mapalab"}

    id = Column(Integer, primary_key=True)
    sub = Column(String(100), unique=True, nullable=True)
    correo = Column(String(254), nullable=False)
    nombre = Column(String(200), nullable=True)
    activo = Column(Boolean, server_default=text("TRUE"), nullable=False)
    ultimo_acceso = Column(DateTime(timezone=True), nullable=True)
    creado_en = Column(DateTime(timezone=True), server_default=text("NOW()"), nullable=False)


class MapalabGrupo(DataEngineBase):
    __tablename__ = "grupos"
    __table_args__ = {"schema": "mapalab"}

    id = Column(Integer, primary_key=True)
    nombre = Column(String(120), nullable=False)
    descripcion = Column(String(300), nullable=True)
    creado_en = Column(DateTime(timezone=True), server_default=text("NOW()"), nullable=False)


class MapalabGrupoMiembro(DataEngineBase):
    __tablename__ = "grupo_miembros"
    __table_args__ = {"schema": "mapalab"}

    grupo_id = Column(Integer, ForeignKey("mapalab.grupos.id", ondelete="CASCADE"), primary_key=True)
    usuario_id = Column(Integer, ForeignKey("mapalab.usuarios.id", ondelete="CASCADE"), primary_key=True)


class MapalabCapaAcceso(DataEngineBase):
    __tablename__ = "capa_acceso"
    __table_args__ = (
        CheckConstraint("(usuario_id IS NULL) <> (grupo_id IS NULL)", name="capa_acceso_check"),
        {"schema": "mapalab"},
    )

    id = Column(Integer, primary_key=True)
    layer_id = Column(
        String(100), ForeignKey("mapalab.layers.id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False
    )
    usuario_id = Column(Integer, ForeignKey("mapalab.usuarios.id", ondelete="CASCADE"), nullable=True)
    grupo_id = Column(Integer, ForeignKey("mapalab.grupos.id", ondelete="CASCADE"), nullable=True)
