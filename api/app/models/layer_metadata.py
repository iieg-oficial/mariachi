from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB

from app.core.database import DataEngineBase


class LayerMetadata(DataEngineBase):
    __tablename__ = 'layer_metadata'
    __table_args__ = {'schema': 'mapalab'}

    layer_key = Column(String(300), primary_key=True)
    workspace = Column(String(200))
    layer_name_db = Column(String(200))
    layer_name_usuario = Column(String(300))
    descripcion = Column(Text)
    fuentes = Column(JSONB)
    metodologia = Column(JSONB)
    metadato = Column(JSONB)
    frecuencia = Column(String(200))
    fecha_ultima = Column(String(200))
    frecuencia_sugerida = Column(String(40))
    fecha_ultima_sugerida = Column(String(20))
    sugerencias_actualizadas_en = Column(DateTime(timezone=True))
    tipo_mapa = Column(String(100))
    tipo_mapa_enlace = Column(String(500))
    texto_leyenda = Column(Text)
    tarjeta_punto_poligono = Column(String(50))
    link_final_capa = Column(String(500))
    downloadable = Column(Boolean, server_default=text('TRUE'), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=text('NOW()'), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=text('NOW()'), nullable=False)
    updated_by = Column(String(100))


class LayerStats(DataEngineBase):
    __tablename__ = 'layer_stats'
    __table_args__ = {'schema': 'mapalab'}

    layer_key = Column(
        String(300),
        ForeignKey('mapalab.layer_metadata.layer_key', ondelete='CASCADE'),
        primary_key=True,
    )
    stats_config = Column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    values = Column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    pie_numeralia = Column(String(500))
    values_refreshed_at = Column(DateTime(timezone=True))
    ttl_minutes = Column(Integer, nullable=False, server_default='1440')
    updated_at = Column(DateTime(timezone=True), server_default=text('NOW()'))
    updated_by = Column(String(150))
