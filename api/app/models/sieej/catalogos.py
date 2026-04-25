from sqlalchemy import Column, Integer, String

from app.core.database import Base

SCHEMA = "sieej"


class CatalogoUnidadAdmin(Base):
    __tablename__ = "catalogo_unidad_admin"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    value = Column(String, unique=True, index=True, nullable=False)


class CatalogoCategoriaDatos(Base):
    __tablename__ = "catalogo_categoria_datos"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    value = Column(String, unique=True, index=True, nullable=False)


class CatalogoHerramientasGestion(Base):
    __tablename__ = "catalogo_herramientas_gestion"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    value = Column(String, unique=True, index=True, nullable=False)


class CatalogoCalidadDatos(Base):
    __tablename__ = "catalogo_calidad_datos"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    value = Column(String, unique=True, index=True, nullable=False)


class CatalogoPeriodicidad(Base):
    __tablename__ = "catalogo_periodicidad"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    value = Column(String, unique=True, index=True, nullable=False)


class CatalogoObjetivoUso(Base):
    __tablename__ = "catalogo_objetivo_uso"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    value = Column(String, unique=True, index=True, nullable=False)


class CatalogoUsuariosDatos(Base):
    __tablename__ = "catalogo_usuarios_datos"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    value = Column(String, unique=True, index=True, nullable=False)


class CatalogoEjesEstrategicos(Base):
    __tablename__ = "catalogo_ejes_estrategicos"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    value = Column(String, unique=True, index=True, nullable=False)
