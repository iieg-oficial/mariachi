from sqlalchemy import Column, Date, Float, ForeignKey, Integer, PrimaryKeyConstraint, String

from app.core.database import Base


class MapalabApiKeyRendimientoDiario(Base):
    __tablename__ = "mapalab_api_keys_rendimiento_diario"
    __table_args__ = (
        PrimaryKeyConstraint(
            "api_key_id",
            "dia",
            "origen",
            "metrica",
            name="pk_mapalab_api_keys_rendimiento_diario",
        ),
    )

    api_key_id = Column(
        Integer,
        ForeignKey("mapalab_api_keys.id", ondelete="CASCADE"),
        nullable=False,
    )
    dia = Column(Date, nullable=False)
    origen = Column(String(255), nullable=False, default="")
    metrica = Column(String(20), nullable=False)
    muestras = Column(Integer, nullable=False, default=0)
    suma = Column(Float, nullable=False, default=0.0)
    buenas = Column(Integer, nullable=False, default=0)
    regulares = Column(Integer, nullable=False, default=0)
    malas = Column(Integer, nullable=False, default=0)


class MapalabApiKeySitioDiario(Base):
    __tablename__ = "mapalab_api_keys_sitios_diario"
    __table_args__ = (
        PrimaryKeyConstraint("api_key_id", "dia", "origen", name="pk_mapalab_api_keys_sitios_diario"),
    )

    api_key_id = Column(
        Integer,
        ForeignKey("mapalab_api_keys.id", ondelete="CASCADE"),
        nullable=False,
    )
    dia = Column(Date, nullable=False)
    origen = Column(String(255), nullable=False, default="")
    cargas = Column(Integer, nullable=False, default=0)
    listos = Column(Integer, nullable=False, default=0)
    errores_js = Column(Integer, nullable=False, default=0)
    denegados = Column(Integer, nullable=False, default=0)
    timeouts = Column(Integer, nullable=False, default=0)
