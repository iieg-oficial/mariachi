from sqlalchemy import (
    JSON,
    BigInteger,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    text,
)
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.core.time import utcnow

SCHEMA = "sieej"


class EnvioFormulario(Base):
    __tablename__ = "envio_formulario"
    __table_args__ = (
        # Un envio por (formulario, dueno, periodo) en formularios periodicos,
        # y uno por (formulario, dueno) en los no periodicos. El dueno es el
        # usuario en los individuales y el grupo en los colaborativos, y por eso
        # cada par de indices excluye al otro por `grupo_id`. Indices unicos
        # parciales complementarios: `sqlite_where` para los tests (SQLite) y
        # `postgresql_where` para produccion.
        Index(
            "uq_envio_formulario_periodo",
            "formulario_id",
            "usuario_id",
            "periodo_id",
            unique=True,
            postgresql_where=text("periodo_id IS NOT NULL AND grupo_id IS NULL"),
            sqlite_where=text("periodo_id IS NOT NULL AND grupo_id IS NULL"),
        ),
        Index(
            "uq_envio_formulario_user",
            "formulario_id",
            "usuario_id",
            unique=True,
            postgresql_where=text("periodo_id IS NULL AND grupo_id IS NULL"),
            sqlite_where=text("periodo_id IS NULL AND grupo_id IS NULL"),
        ),
        Index(
            "uq_envio_grupo_periodo",
            "formulario_id",
            "grupo_id",
            "periodo_id",
            unique=True,
            postgresql_where=text("grupo_id IS NOT NULL AND periodo_id IS NOT NULL"),
            sqlite_where=text("grupo_id IS NOT NULL AND periodo_id IS NOT NULL"),
        ),
        Index(
            "uq_envio_grupo",
            "formulario_id",
            "grupo_id",
            unique=True,
            postgresql_where=text("grupo_id IS NOT NULL AND periodo_id IS NULL"),
            sqlite_where=text("grupo_id IS NOT NULL AND periodo_id IS NULL"),
        ),
        {"schema": SCHEMA},
    )

    id = Column(Integer, primary_key=True, index=True)
    formulario_id = Column(
        Integer,
        ForeignKey(f"{SCHEMA}.formulario.id", ondelete="CASCADE"),
        nullable=False,
    )
    formulario_version = Column(Integer, nullable=False)
    definicion_snapshot = Column(JSON, nullable=False)
    usuario_id = Column(
        Integer,
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    grupo_id = Column(
        Integer,
        ForeignKey(f"{SCHEMA}.grupo.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    periodo_id = Column(
        Integer,
        ForeignKey(f"{SCHEMA}.formulario_periodo.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    estado = Column(
        Enum(
            "en_proceso",
            "enviado",
            "expirado",
            name="sieej_envio_estado",
            schema=SCHEMA,
        ),
        nullable=False,
        default="en_proceso",
        index=True,
    )
    datos = Column(JSON, nullable=False, default=dict)
    datos_version = Column(Integer, nullable=False, default=0)
    cambios_pendientes = Column(JSON, nullable=True)
    paso_actual = Column(Integer, nullable=False, default=0)
    iniciado_en = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    enviado_en = Column(DateTime(timezone=True), nullable=True)
    expirado_en = Column(DateTime(timezone=True), nullable=True)
    eliminado_en = Column(DateTime(timezone=True), nullable=True, index=True)
    actualizado_en = Column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    formulario = relationship("Formulario", lazy="select")
    usuario = relationship("Usuario", lazy="select")
    grupo = relationship("Grupo", lazy="select")
    archivos = relationship(
        "EnvioArchivo",
        back_populates="envio",
        cascade="all, delete-orphan",
        lazy="select",
    )
    eventos = relationship(
        "EnvioEvento",
        back_populates="envio",
        cascade="all, delete-orphan",
        lazy="select",
        order_by="EnvioEvento.ocurrido_en.desc()",
    )
    historial_valores = relationship(
        "EnvioValorHistorial",
        back_populates="envio",
        cascade="all, delete-orphan",
        lazy="select",
        order_by="EnvioValorHistorial.cambiado_en",
    )


class EnvioArchivo(Base):
    __tablename__ = "envio_archivo"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    envio_id = Column(
        Integer,
        ForeignKey(f"{SCHEMA}.envio_formulario.id", ondelete="CASCADE"),
        nullable=False,
    )
    field_path = Column(String(512), nullable=False)
    bucket = Column(String(128), nullable=False)
    object_key = Column(String(512), nullable=False)
    url_publica = Column(String(1024), nullable=True)
    filename_original = Column(String(255), nullable=False)
    mime = Column(String(128), nullable=False)
    size_bytes = Column(BigInteger, nullable=False)
    subido_en = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    envio = relationship("EnvioFormulario", back_populates="archivos", lazy="select")


class EnvioEvento(Base):
    __tablename__ = "envio_evento"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    envio_id = Column(
        Integer,
        ForeignKey(f"{SCHEMA}.envio_formulario.id", ondelete="CASCADE"),
        nullable=False,
    )
    tipo = Column(
        Enum(
            "iniciado",
            "guardado",
            "enviado",
            "expirado",
            "reabierto",
            "actualizado",
            name="sieej_evento_tipo",
            schema=SCHEMA,
        ),
        nullable=False,
    )
    payload = Column(JSON, nullable=True)
    actor_usuario_id = Column(
        Integer,
        ForeignKey("usuarios.id", ondelete="SET NULL"),
        nullable=True,
    )
    ocurrido_en = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    envio = relationship("EnvioFormulario", back_populates="eventos", lazy="select")
    actor = relationship("Usuario", lazy="select")


class EnvioValorHistorial(Base):
    """Historial de valores por campo: la fuente unica de "que cambio, quien y
    cuando".

    `origen` separa dos flujos con reglas distintas. `correccion` es la
    actualizacion ligera de un envio `enviado`: append puro, nunca se
    sobreescribe ni se borra, que es lo que le da valor de auditoria formal.
    `captura` es el llenado en proceso, donde cada blur puede generar una fila;
    ahi dos ediciones del mismo actor sobre el mismo campo dentro de
    `campos_service.VENTANA_COALESCING` colapsan en una sola, conservando el
    `valor_anterior` con que abrio la ventana.
    """

    __tablename__ = "envio_valor_historial"
    __table_args__ = (
        Index(
            "ix_historial_envio_path_fecha",
            "envio_id",
            "field_path",
            text("cambiado_en DESC"),
        ),
        {"schema": SCHEMA},
    )

    id = Column(Integer, primary_key=True, index=True)
    envio_id = Column(
        Integer,
        ForeignKey(f"{SCHEMA}.envio_formulario.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    field_path = Column(String(512), nullable=False)
    field_label = Column(String(512), nullable=True)
    valor_anterior = Column(JSON, nullable=True)
    valor_nuevo = Column(JSON, nullable=True)
    formulario_version = Column(Integer, nullable=False)
    datos_version = Column(Integer, nullable=False, default=0)
    origen = Column(
        Enum(
            "captura",
            "correccion",
            name="sieej_historial_origen",
            schema=SCHEMA,
        ),
        nullable=False,
        default="correccion",
    )
    actor_usuario_id = Column(
        Integer,
        ForeignKey("usuarios.id", ondelete="SET NULL"),
        nullable=True,
    )
    cambiado_en = Column(
        DateTime(timezone=True), default=utcnow, nullable=False, index=True
    )

    envio = relationship(
        "EnvioFormulario", back_populates="historial_valores", lazy="select"
    )
    actor = relationship(
        "Usuario", foreign_keys=[actor_usuario_id], lazy="select"
    )
