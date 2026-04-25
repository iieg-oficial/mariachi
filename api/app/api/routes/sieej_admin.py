from fastapi import APIRouter, Depends
from sqlalchemy import distinct, func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.project import Project, UserProject
from app.models.sieej import BasesDatos, Enlace, General

router = APIRouter(prefix="/sieej", tags=["sieej-admin"])


@router.get("/stats")
async def stats(db: Session = Depends(get_db)):
    sieej_project = db.query(Project).filter(Project.slug == "sieej").first()

    if sieej_project is None:
        return {
            "dependencias_total": 0,
            "con_general": 0,
            "con_enlace": 0,
            "con_bases_datos": 0,
            "bases_datos_total": 0,
            "bases_datos_con_diccionario": 0,
        }

    dependencias_total = (
        db.query(func.count(UserProject.user_id))
        .filter(UserProject.project_id == sieej_project.id)
        .scalar()
    )

    con_general = (
        db.query(func.count(distinct(General.user_id)))
        .filter(General.is_active.is_(True))
        .scalar()
    )

    con_enlace = (
        db.query(func.count(distinct(Enlace.user_id)))
        .filter(Enlace.is_active.is_(True))
        .scalar()
    )

    con_bases_datos = (
        db.query(func.count(distinct(BasesDatos.user_id)))
        .filter(BasesDatos.is_active.is_(True))
        .scalar()
    )

    bases_datos_total = (
        db.query(func.count(BasesDatos.id))
        .filter(BasesDatos.is_active.is_(True))
        .scalar()
    )

    bases_datos_con_diccionario = (
        db.query(func.count(BasesDatos.id))
        .filter(
            BasesDatos.is_active.is_(True),
            BasesDatos.ruta_diccionario.isnot(None),
        )
        .scalar()
    )

    return {
        "dependencias_total": dependencias_total or 0,
        "con_general": con_general or 0,
        "con_enlace": con_enlace or 0,
        "con_bases_datos": con_bases_datos or 0,
        "bases_datos_total": bases_datos_total or 0,
        "bases_datos_con_diccionario": bases_datos_con_diccionario or 0,
    }
