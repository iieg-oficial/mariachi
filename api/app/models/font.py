from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class Font(Base):
    """
    Modelo para fuentes tipográficas personalizadas

    Permite subir archivos de fuentes (.woff2, .woff, .ttf, .otf) y gestionar
    las tipografías disponibles en el sistema.

    Una familia de fuente (ej: "Montserrat") puede tener múltiples variantes
    con diferentes weights (400, 700) y styles (normal, italic).
    """
    __tablename__ = "fonts"

    id = Column(Integer, primary_key=True, index=True)

    # Nombre descriptivo para mostrar en el CMS (ej: "Montserrat Bold")
    name = Column(String, nullable=False)

    # Font-family CSS (ej: "Montserrat")
    # Múltiples fuentes pueden compartir la misma familia
    family = Column(String, nullable=False, index=True)

    # Estilo: "normal" | "italic" | "oblique"
    style = Column(String, default="normal", nullable=False)

    # Peso: 100, 200, 300, 400 (normal), 500, 600, 700 (bold), 800, 900
    weight = Column(Integer, default=400, nullable=False)

    # Formato del archivo: "woff2" | "woff" | "ttf" | "otf"
    format = Column(String, nullable=False)

    # URL pública del archivo en MinIO
    url = Column(String, nullable=False)

    # Tamaño del archivo en bytes
    file_size = Column(Integer, nullable=False)

    # Usuario que subió la fuente
    uploaded_by = Column(Integer, ForeignKey("usuarios.id"), nullable=False)

    # Fecha de subida
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relaciones
    uploaded_by_user = relationship("Usuario", back_populates="font_uploads")
