from fastapi import APIRouter, Depends
from sqlalchemy import distinct, func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.project import Project, UserProject
from app.models.sieej import EnvioArchivo, EnvioFormulario, Formulario

router = APIRouter()


@router.get("/stats")
async def stats(db: Session = Depends(get_db)):
    sieej_project = db.query(Project).filter(Project.slug == "sieej").first()

    dependencias_total = (
        db.query(func.count(UserProject.user_id))
        .filter(UserProject.project_id == sieej_project.id)
        .scalar()
        if sieej_project else 0
    )

    formularios_activos = (
        db.query(func.count(Formulario.id))
        .filter(Formulario.estado == "activo")
        .scalar()
    )

    envios_total = db.query(func.count(EnvioFormulario.id)).scalar()
    envios_enviados = (
        db.query(func.count(EnvioFormulario.id))
        .filter(EnvioFormulario.estado == "enviado")
        .scalar()
    )
    envios_en_proceso = (
        db.query(func.count(EnvioFormulario.id))
        .filter(EnvioFormulario.estado == "en_proceso")
        .scalar()
    )
    envios_expirados = (
        db.query(func.count(EnvioFormulario.id))
        .filter(EnvioFormulario.estado == "expirado")
        .scalar()
    )

    usuarios_con_envio = (
        db.query(func.count(distinct(EnvioFormulario.usuario_id)))
        .filter(EnvioFormulario.usuario_id.isnot(None))
        .scalar()
    )

    archivos_total = db.query(func.count(EnvioArchivo.id)).scalar()

    return {
        "dependencias_total": dependencias_total or 0,
        "formularios_activos": formularios_activos or 0,
        "envios_total": envios_total or 0,
        "envios_enviados": envios_enviados or 0,
        "envios_en_proceso": envios_en_proceso or 0,
        "envios_expirados": envios_expirados or 0,
        "usuarios_con_envio": usuarios_con_envio or 0,
        "archivos_total": archivos_total or 0,
    }
