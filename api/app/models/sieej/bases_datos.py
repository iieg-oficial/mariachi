from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base

SCHEMA = "sieej"


class BDEjesEstrategicos(Base):
    __tablename__ = "bd_ejes_estrategicos"
    __table_args__ = {"schema": SCHEMA}

    id_bases_datos = Column(
        Integer,
        ForeignKey(f"{SCHEMA}.bases_datos.id", ondelete="CASCADE"),
        primary_key=True,
    )
    id_eje_estrategico = Column(
        Integer,
        ForeignKey(f"{SCHEMA}.catalogo_ejes_estrategicos.id", ondelete="RESTRICT"),
        primary_key=True,
    )


class BasesDatos(Base):
    __tablename__ = "bases_datos"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)

    nombre_bd = Column(String, nullable=False)
    descripcion_bd = Column(Text, nullable=False)

    categoria_datos_id = Column(
        Integer,
        ForeignKey(f"{SCHEMA}.catalogo_categoria_datos.id", ondelete="RESTRICT"),
        nullable=True,
    )
    herramientas_gestion_id = Column(
        Integer,
        ForeignKey(f"{SCHEMA}.catalogo_herramientas_gestion.id", ondelete="RESTRICT"),
        nullable=True,
    )
    calidad_datos_id = Column(
        Integer,
        ForeignKey(f"{SCHEMA}.catalogo_calidad_datos.id", ondelete="RESTRICT"),
        nullable=True,
    )
    periodicidad_id = Column(
        Integer,
        ForeignKey(f"{SCHEMA}.catalogo_periodicidad.id", ondelete="RESTRICT"),
        nullable=True,
    )
    objetivo_uso_id = Column(
        Integer,
        ForeignKey(f"{SCHEMA}.catalogo_objetivo_uso.id", ondelete="RESTRICT"),
        nullable=True,
    )
    usuarios_datos_id = Column(
        Integer,
        ForeignKey(f"{SCHEMA}.catalogo_usuarios_datos.id", ondelete="RESTRICT"),
        nullable=True,
    )

    limpieza_validacion = Column(Boolean, nullable=True)
    desc_limpieza_validacion = Column(Text, nullable=True)
    proveedores_bd = Column(Text, nullable=True)

    desc_periodicidad = Column(Text, nullable=True)
    tiene_diccionario = Column(Boolean, nullable=True)
    ruta_diccionario = Column(String, nullable=True)

    quienes_son = Column(Text, nullable=True)
    historicos = Column(Boolean, nullable=True)
    desc_historicos = Column(Text, nullable=True)
    migracion_actualizacion = Column(Boolean, nullable=True)
    desc_migracion_actualizacion = Column(Text, nullable=True)
    medidas_seguridad = Column(Boolean, nullable=True)
    desc_medidas_seguridad = Column(Text, nullable=True)
    normativas_proteccion = Column(Boolean, nullable=True)
    desc_normativas_proteccion = Column(Text, nullable=True)
    plan_contingencia = Column(Boolean, nullable=True)
    desc_plan_contingencia = Column(Text, nullable=True)
    interoperatividad = Column(Boolean, nullable=True)
    desc_interoperatividad = Column(Text, nullable=True)
    plataforma_difusion = Column(Boolean, nullable=True)
    nombre_plataforma_difusion = Column(String, nullable=True)
    url_plataforma_difusion = Column(String, nullable=True)
    retos = Column(Text, nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    categoria_datos = relationship("CatalogoCategoriaDatos", lazy="select")
    herramientas_gestion = relationship("CatalogoHerramientasGestion", lazy="select")
    calidad_datos = relationship("CatalogoCalidadDatos", lazy="select")
    periodicidad = relationship("CatalogoPeriodicidad", lazy="select")
    objetivo_uso = relationship("CatalogoObjetivoUso", lazy="select")
    usuarios_datos = relationship("CatalogoUsuariosDatos", lazy="select")
    ejes_estrategicos = relationship(
        "CatalogoEjesEstrategicos",
        secondary=BDEjesEstrategicos.__table__,
        lazy="select",
    )
