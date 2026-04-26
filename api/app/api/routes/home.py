import copy

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.api.deps import get_db, require_project_access, verify_csrf
from app.core.time import utcnow
from app.models.home_section import HomeSection
from app.models.user import Usuario
from app.schemas.home_section import (
    SECTION_SCHEMAS,
    HomePublicResponse,
    HomeSectionResponse,
)

router = APIRouter(
    prefix="/home",
    tags=["home mapalab"],
    dependencies=[Depends(require_project_access("mapalab"))],
)

_require_editor = require_project_access("mapalab", min_role="editor")


def _get_section_or_404(db: Session, key: str) -> HomeSection:
    if key not in SECTION_SCHEMAS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sección desconocida: {key}",
        )
    section = db.query(HomeSection).filter(HomeSection.key == key).first()
    if not section:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sección '{key}' no inicializada (revisa migraciones)",
        )
    return section


def _validate_payload(key: str, payload: dict) -> dict:
    schema_cls = SECTION_SCHEMAS[key]
    try:
        validated = schema_cls.model_validate(payload)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Payload inválido para sección '{key}': {exc}",
        ) from exc
    return validated.model_dump()


@router.get("", response_model=list[HomeSectionResponse])
async def listar_secciones(db: Session = Depends(get_db)):
    return db.query(HomeSection).all()


@router.get("/preview", response_model=HomePublicResponse)
async def preview_home(db: Session = Depends(get_db)):
    secciones = {s.key: s.payload_draft for s in db.query(HomeSection).all()}
    return _build_public(secciones)


@router.get("/{key}", response_model=HomeSectionResponse)
async def obtener_seccion(key: str, db: Session = Depends(get_db)):
    return _get_section_or_404(db, key)


@router.put("/{key}", response_model=HomeSectionResponse)
async def actualizar_borrador(
    key: str,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
    _editor: Usuario = Depends(_require_editor),
):
    section = _get_section_or_404(db, key)
    section.payload_draft = _validate_payload(key, payload)
    flag_modified(section, 'payload_draft')
    section.updated_at = utcnow()
    db.commit()
    db.refresh(section)
    return section


@router.post("/{key}/publicar", response_model=HomeSectionResponse)
async def publicar_seccion(
    key: str,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
    _editor: Usuario = Depends(_require_editor),
):
    section = _get_section_or_404(db, key)
    section.payload_published = copy.deepcopy(section.payload_draft)
    flag_modified(section, 'payload_published')
    section.published_at = utcnow()
    section.updated_at = utcnow()
    db.commit()
    db.refresh(section)
    return section


@router.post("/{key}/descartar", response_model=HomeSectionResponse)
async def descartar_borrador(
    key: str,
    db: Session = Depends(get_db),
    _csrf: Usuario = Depends(verify_csrf),
    _editor: Usuario = Depends(_require_editor),
):
    section = _get_section_or_404(db, key)
    section.payload_draft = copy.deepcopy(section.payload_published)
    flag_modified(section, 'payload_draft')
    section.updated_at = utcnow()
    db.commit()
    db.refresh(section)
    return section


def _build_public(payloads_by_key: dict) -> HomePublicResponse:
    sanitized = {}
    for key, schema_cls in SECTION_SCHEMAS.items():
        raw = payloads_by_key.get(key) or {}
        try:
            sanitized[key] = schema_cls.model_validate(raw)
        except Exception:
            sanitized[key] = schema_cls()
    return HomePublicResponse(**sanitized)
