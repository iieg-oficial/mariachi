from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, verify_csrf
from app.models.font import Font
from app.models.user import Usuario
from app.schemas.font import FontFamily, FontListItem, FontResponse
from app.services.acervo import get_acervo_service

router = APIRouter(prefix="/fonts", tags=["fonts"])

# Formatos de fuente permitidos
ALLOWED_FONT_FORMATS = {
    # WOFF2
    "font/woff2": "woff2",
    "application/font-woff2": "woff2",
    # WOFF
    "font/woff": "woff",
    "application/font-woff": "woff",
    "application/x-font-woff": "woff",
    # TTF
    "font/ttf": "ttf",
    "application/x-font-ttf": "ttf",
    "application/x-font-truetype": "ttf",
    "font/truetype": "ttf",
    # OTF
    "font/otf": "otf",
    "application/x-font-otf": "otf",
    "application/vnd.ms-opentype": "otf",  # Windows
    "application/font-sfnt": "otf",
    "font/sfnt": "otf",
    # Fallback genérico (se validará por extensión)
    "application/octet-stream": None,  # Se determinará por extensión
    "application/vnd.oasis.opendocument.formula-template": None,  # Algunos navegadores envían esto
}


@router.post("", status_code=status.HTTP_201_CREATED, response_model=FontResponse)
async def subir_fuente(
    file: UploadFile = File(...),
    name: Annotated[str, Form()] = ...,
    family: Annotated[str, Form()] = ...,
    style: Annotated[str, Form()] = "normal",
    weight: Annotated[int, Form()] = 400,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    """
    Sube un archivo de fuente (.woff2, .woff, .ttf, .otf) a MinIO

    Args:
        file: Archivo de fuente
        name: Nombre descriptivo (ej: "Montserrat Bold")
        family: Font-family CSS (ej: "Montserrat")
        style: normal | italic | oblique
        weight: 100-900
    """
    # Validar tipo de archivo
    content_type = file.content_type

    # Si el content_type no está en la lista, rechazar
    if content_type not in ALLOWED_FONT_FORMATS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de archivo no permitido: {content_type}. Formatos aceptados: .woff2, .woff, .ttf, .otf"
        )

    font_format = ALLOWED_FONT_FORMATS[content_type]

    # Si el formato es None (application/octet-stream), determinar por extensión
    if font_format is None:
        filename_lower = file.filename.lower()
        if filename_lower.endswith('.woff2'):
            font_format = 'woff2'
        elif filename_lower.endswith('.woff'):
            font_format = 'woff'
        elif filename_lower.endswith('.ttf'):
            font_format = 'ttf'
        elif filename_lower.endswith('.otf'):
            font_format = 'otf'
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Extensión de archivo no válida. Formatos aceptados: .woff2, .woff, .ttf, .otf"
            )

    # Validar peso
    if weight < 100 or weight > 900:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El peso de la fuente debe estar entre 100 y 900"
        )

    # Validar estilo
    if style not in ["normal", "italic", "oblique"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El estilo debe ser: normal, italic o oblique"
        )

    # Generar nombre único para el archivo en MinIO
    import uuid
    file_extension = f".{font_format}"
    object_name = f"fonts/{uuid.uuid4()}{file_extension}"

    # Subir a MinIO
    acervo_service = get_acervo_service()
    try:
        url = await acervo_service.upload_file(file, object_name)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al subir la fuente: {str(e)}"
        )

    # Obtener tamaño del archivo
    file.file.seek(0, 2)  # Ir al final del archivo
    file_size = file.file.tell()
    file.file.seek(0)  # Volver al inicio

    # Guardar en base de datos
    nueva_fuente = Font(
        name=name,
        family=family,
        style=style,
        weight=weight,
        format=font_format,
        url=url,
        file_size=file_size,
        uploaded_by=current_user.id,
    )

    db.add(nueva_fuente)
    db.commit()
    db.refresh(nueva_fuente)

    return FontResponse(
        id=str(nueva_fuente.id),
        name=nueva_fuente.name,
        family=nueva_fuente.family,
        style=nueva_fuente.style,
        weight=nueva_fuente.weight,
        format=nueva_fuente.format,
        url=nueva_fuente.url,
        file_size=nueva_fuente.file_size,
        uploaded_by=str(nueva_fuente.uploaded_by),
        uploaded_by_name=current_user.name,
        uploaded_at=nueva_fuente.uploaded_at,
    )


@router.get("", response_model=list[FontListItem])
async def listar_fuentes(
    family: str | None = None,
    db: Session = Depends(get_db),
):
    """
    Lista todas las fuentes disponibles

    Args:
        family: Filtrar por familia (opcional)
    """
    query = db.query(Font)

    if family:
        query = query.filter(Font.family == family)

    fuentes = query.order_by(Font.family, Font.weight, Font.style).all()

    return [
        FontListItem(
            id=str(fuente.id),
            name=fuente.name,
            family=fuente.family,
            style=fuente.style,
            weight=fuente.weight,
            format=fuente.format,
            url=fuente.url,
        )
        for fuente in fuentes
    ]


@router.get("/families", response_model=list[FontFamily])
async def listar_familias(db: Session = Depends(get_db)):
    """
    Lista familias de fuentes agrupadas
    """
    fuentes = db.query(Font).order_by(Font.family, Font.weight, Font.style).all()

    # Agrupar por familia
    familias_dict: dict[str, list[FontListItem]] = {}
    for fuente in fuentes:
        if fuente.family not in familias_dict:
            familias_dict[fuente.family] = []

        familias_dict[fuente.family].append(
            FontListItem(
                id=str(fuente.id),
                name=fuente.name,
                family=fuente.family,
                style=fuente.style,
                weight=fuente.weight,
                format=fuente.format,
                url=fuente.url,
            )
        )

    return [
        FontFamily(family=family, variants=variants)
        for family, variants in familias_dict.items()
    ]


@router.put("/{font_id}", response_model=FontResponse)
async def actualizar_fuente(
    font_id: int,
    name: Annotated[str, Form()],
    family: Annotated[str, Form()],
    style: Annotated[str, Form()] = "normal",
    weight: Annotated[int, Form()] = 400,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    """
    Actualiza las propiedades de una fuente (sin cambiar el archivo)
    """
    fuente = db.query(Font).filter(Font.id == font_id).first()

    if not fuente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fuente no encontrada"
        )

    # Validar peso
    if weight < 100 or weight > 900:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El peso de la fuente debe estar entre 100 y 900"
        )

    # Validar estilo
    if style not in ["normal", "italic", "oblique"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El estilo debe ser: normal, italic o oblique"
        )

    # Actualizar propiedades
    fuente.name = name
    fuente.family = family
    fuente.style = style
    fuente.weight = weight

    db.commit()
    db.refresh(fuente)

    # Obtener nombre del usuario
    uploader = db.query(Usuario).filter(Usuario.id == fuente.uploaded_by).first()

    return FontResponse(
        id=str(fuente.id),
        name=fuente.name,
        family=fuente.family,
        style=fuente.style,
        weight=fuente.weight,
        format=fuente.format,
        url=fuente.url,
        file_size=fuente.file_size,
        uploaded_by=str(fuente.uploaded_by),
        uploaded_by_name=uploader.name if uploader else "Unknown",
        uploaded_at=fuente.uploaded_at,
    )


@router.delete("/{font_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_fuente(
    font_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    """
    Elimina una fuente
    """
    fuente = db.query(Font).filter(Font.id == font_id).first()

    if not fuente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fuente no encontrada"
        )

    # Eliminar archivo de MinIO
    acervo_service = get_acervo_service()
    # Extraer object_name de la URL
    object_name = fuente.url.split("/")[-2] + "/" + fuente.url.split("/")[-1]
    acervo_service.delete_file(object_name)

    # Eliminar de base de datos
    db.delete(fuente)
    db.commit()

    return None
