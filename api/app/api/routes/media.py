import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, verify_csrf
from app.models.media import Media, MediaFolder
from app.models.user import Usuario
from app.schemas.media import FolderCreate, FolderResponse
from app.services.acervo import get_acervo_service

router = APIRouter(prefix="/multimedia", tags=["media"])


@router.get("", response_model=list[dict])
async def listar_media(
    db: Session = Depends(get_db),
    folder: str | None = Query(None),
    type: str | None = Query(None),
    search: str | None = Query(None),
):
    query = db.query(Media)

    if folder:
        query = query.filter(Media.folder == folder)

    if type:
        query = query.filter(Media.type.startswith(type))

    if search:
        search_lower = f"%{search.lower()}%"
        query = query.filter(
            Media.name.ilike(search_lower) | Media.original_name.ilike(search_lower)
        )

    media_items = query.order_by(Media.uploaded_at.desc()).all()

    return [
        {
            "id": str(item.id),
            "name": item.name,
            "originalName": item.original_name,
            "type": item.type,
            "size": item.size,
            "url": item.url,
            "thumbnail": item.thumbnail,
            "folder": item.folder,
            "uploadedBy": str(item.uploaded_by),
            "uploadedByName": item.uploaded_by_user.name if item.uploaded_by_user else "Unknown",
            "uploadedAt": item.uploaded_at.isoformat(),
            "metadata": item.metadata_json or {},
        }
        for item in media_items
    ]


@router.get("/carpetas", response_model=list[dict])
async def listar_carpetas(db: Session = Depends(get_db)):
    folders = db.query(MediaFolder).all()
    return [
        {"id": str(folder.id), "name": folder.name, "path": folder.path, "parent": folder.parent}
        for folder in folders
    ]


@router.post("", status_code=status.HTTP_201_CREATED)
async def subir_archivo(
    file: UploadFile = File(...),
    folder: str = Form("/"),
    alt: str = Form(""),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    acervo_service = get_acervo_service()

    file_extension = file.filename.split(".")[-1] if "." in file.filename else ""
    unique_name = f"{uuid.uuid4()}.{file_extension}" if file_extension else str(uuid.uuid4())

    try:
        url = await acervo_service.upload_file(file, unique_name)

        nuevo_media = Media(
            name=unique_name,
            original_name=file.filename,
            type=file.content_type or "application/octet-stream",
            size=file.size or 0,
            url=url,
            thumbnail=url if file.content_type and file.content_type.startswith("image/") else None,
            folder=folder,
            uploaded_by=current_user.id,
            metadata_json={"alt": alt} if alt else {},
        )

        db.add(nuevo_media)
        db.commit()
        db.refresh(nuevo_media)

        return {
            "id": str(nuevo_media.id),
            "name": nuevo_media.name,
            "originalName": nuevo_media.original_name,
            "type": nuevo_media.type,
            "size": nuevo_media.size,
            "url": nuevo_media.url,
            "thumbnail": nuevo_media.thumbnail,
            "folder": nuevo_media.folder,
            "uploadedBy": str(nuevo_media.uploaded_by),
            "uploadedAt": nuevo_media.uploaded_at.isoformat(),
            "metadata": nuevo_media.metadata_json or {},
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al subir archivo: {str(e)}",
        )


@router.delete("/{media_id}")
async def eliminar_archivo(
    media_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    media_item = db.query(Media).filter(Media.id == media_id).first()
    if not media_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Archivo no encontrado"
        )

    acervo_service = get_acervo_service()
    acervo_service.delete_file(media_item.name)

    db.delete(media_item)
    db.commit()

    return {"message": "Archivo eliminado exitosamente"}


@router.post("/carpetas", status_code=status.HTTP_201_CREATED, response_model=FolderResponse)
async def crear_carpeta(
    folder_data: FolderCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(verify_csrf),
):
    # Construir path normalizado sin doble slashes
    if folder_data.parent:
        # Si parent termina en /, no agregar otro /
        if folder_data.parent.endswith('/'):
            path = f"{folder_data.parent}{folder_data.name}"
        else:
            path = f"{folder_data.parent}/{folder_data.name}"
    else:
        path = f"/{folder_data.name}"

    nueva_carpeta = MediaFolder(name=folder_data.name, path=path, parent=folder_data.parent)
    db.add(nueva_carpeta)
    db.commit()
    db.refresh(nueva_carpeta)

    return FolderResponse(
        id=str(nueva_carpeta.id),
        name=nueva_carpeta.name,
        path=nueva_carpeta.path,
        parent=nueva_carpeta.parent,
    )
