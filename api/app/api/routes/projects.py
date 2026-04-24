import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_role, verify_csrf
from app.api.metrics import COUNTER_PROJECT_WRITES, incr
from app.core.database import get_db
from app.models.project import Project, UserProject
from app.models.user import Usuario
from app.schemas.project import (
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
    UserProjectAssignment,
    UserProjectMembership,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    _: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Project).filter(Project.is_active.is_(True)).order_by(Project.slug).all()


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate,
    _: Usuario = Depends(require_role(["tetlamamakani"])),
    __: Usuario = Depends(verify_csrf),
    db: Session = Depends(get_db),
):
    if db.query(Project).filter(Project.slug == payload.slug).first():
        raise HTTPException(status.HTTP_409_CONFLICT, detail="slug ya existe")
    project = Project(**payload.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    incr(COUNTER_PROJECT_WRITES)
    logger.info("action=project.create user_id=%s slug=%s", _.id, project.slug)
    return project


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    payload: ProjectUpdate,
    _: Usuario = Depends(require_role(["tetlamamakani"])),
    __: Usuario = Depends(verify_csrf),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="proyecto no encontrado")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    incr(COUNTER_PROJECT_WRITES)
    logger.info("action=project.update user_id=%s slug=%s", _.id, project.slug)
    return project


@router.get("/{project_id}/members", response_model=list[dict])
async def list_project_members(
    project_id: int,
    _: Usuario = Depends(require_role(["tetlamamakani"])),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Usuario.id, Usuario.username, Usuario.name, UserProject.project_role)
        .join(UserProject, UserProject.user_id == Usuario.id)
        .filter(UserProject.project_id == project_id)
        .all()
    )
    return [
        {"user_id": r.id, "username": r.username, "name": r.name, "project_role": r.project_role}
        for r in rows
    ]


@router.put("/users/{user_id}", response_model=list[UserProjectMembership])
async def set_user_projects(
    user_id: int,
    assignments: list[UserProjectAssignment],
    _: Usuario = Depends(require_role(["tetlamamakani"])),
    __: Usuario = Depends(verify_csrf),
    db: Session = Depends(get_db),
):
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="usuario no encontrado")

    slugs = [a.project_slug for a in assignments]
    projects = db.query(Project).filter(Project.slug.in_(slugs)).all()
    slug_to_id = {p.slug: p.id for p in projects}
    missing = [s for s in slugs if s not in slug_to_id]
    if missing:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail=f"proyectos no encontrados: {missing}",
        )

    db.query(UserProject).filter(UserProject.user_id == user_id).delete()
    for a in assignments:
        db.add(
            UserProject(
                user_id=user_id,
                project_id=slug_to_id[a.project_slug],
                project_role=a.project_role,
            )
        )
    db.commit()
    incr(COUNTER_PROJECT_WRITES)
    logger.info(
        "action=project.set_memberships actor=%s target_user=%s slugs=%s",
        _.id, user_id, slugs,
    )

    rows = (
        db.query(Project.slug, Project.name, UserProject.project_role)
        .join(UserProject, UserProject.project_id == Project.id)
        .filter(UserProject.user_id == user_id)
        .all()
    )
    return [
        {"slug": r.slug, "name": r.name, "project_role": r.project_role}
        for r in rows
    ]
