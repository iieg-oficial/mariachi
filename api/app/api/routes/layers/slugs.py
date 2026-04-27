from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import verify_csrf
from app.api.routes.layers._deps import (
    require_admin,
    require_project_editor,
    write_rate_limit,
)
from app.core.database import get_dataengine_db
from app.models.layer import Layer
from app.models.user import Usuario
from app.schemas.layer import (
    BulkSlugGenerateResponse,
    BulkSlugGenerateResult,
    SlugSuggestRequest,
    SlugSuggestResponse,
)
from app.services import slug_service
from app.services.mapalab_notifier import notify_tree_changed

router = APIRouter(prefix='/slugs')


@router.post('/suggest', response_model=SlugSuggestResponse)
async def suggest_slug(
    body: SlugSuggestRequest,
    db: Session = Depends(get_dataengine_db),
    _editor: Usuario = Depends(require_project_editor),
):
    base = slug_service.slugify(body.label) or "capa"
    if not slug_service.is_valid_slug(base):
        base = "capa"
    final = slug_service.resolve_collision(db, base)
    return SlugSuggestResponse(slug=final, available=(final == base))


@router.post('/bulk-generate', response_model=BulkSlugGenerateResponse)
async def bulk_generate_slugs(
    body: dict,
    db: Session = Depends(get_dataengine_db),
    _csrf: Usuario = Depends(verify_csrf),
    _admin: Usuario = Depends(require_admin),
    _rl: Usuario = Depends(write_rate_limit),
):
    overwrite = bool(body.get("overwrite", False))
    layers = db.query(Layer).filter(Layer.node_type == "leaf").order_by(Layer.id).all()
    results = slug_service.generate_for_layers(db, layers, overwrite_existing=overwrite)
    db.commit()
    notify_tree_changed()

    typed_results = [BulkSlugGenerateResult(**r) for r in results]
    assigned = sum(1 for r in typed_results if r.status != "skipped_existing")
    skipped = sum(1 for r in typed_results if r.status == "skipped_existing")
    return BulkSlugGenerateResponse(
        total=len(typed_results),
        assigned=assigned,
        skipped=skipped,
        results=typed_results,
    )
