from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, SmallInteger, String, Text, text

from app.core.database import DataEngineBase

FORMATOS = ('entero', 'decimal', 'fecha', 'moneda', 'texto')


class ColumnaTabla(DataEngineBase):
    __tablename__ = 'columnas'
    __table_args__ = (
        CheckConstraint(
            "formato IS NULL OR formato IN ('entero', 'decimal', 'fecha', 'moneda', 'texto')",
            name='columnas_formato_valido',
        ),
        {'schema': 'atributos'},
    )

    layer_key = Column(Text, primary_key=True)
    columna = Column(Text, primary_key=True)
    alias = Column(Text)
    orden = Column(SmallInteger, nullable=False, server_default='0')
    visible = Column(Boolean, nullable=False, server_default=text('TRUE'))
    formato = Column(Text)
    updated_at = Column(DateTime(timezone=True), server_default=text('NOW()'), nullable=False)
    updated_by = Column(String(100))
