from sqlalchemy import BigInteger, Column, DateTime, String, Text, text

from app.core.database import DataEngineBase


class GridCellHistory(DataEngineBase):
    __tablename__ = 'grid_cell_history'
    __table_args__ = {'schema': 'mapalab'}

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    resource = Column(String(60), nullable=False)
    row_key = Column(String(300), nullable=False)
    column_key = Column(String(100), nullable=False)
    from_value = Column(Text)
    to_value = Column(Text)
    changed_by = Column(String(150))
    changed_at = Column(DateTime(timezone=True), server_default=text('NOW()'), nullable=False)
    source = Column(String(20), nullable=False, server_default='grid')
