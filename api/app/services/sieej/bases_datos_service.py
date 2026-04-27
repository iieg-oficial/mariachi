import uuid

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.time import utcnow
from app.models.media_bucket import MediaBucket
from app.models.project import Project
from app.models.sieej import (
    BasesDatos,
    CatalogoCalidadDatos,
    CatalogoCategoriaDatos,
    CatalogoEjesEstrategicos,
    CatalogoHerramientasGestion,
    CatalogoObjetivoUso,
    CatalogoPeriodicidad,
    CatalogoUsuariosDatos,
)
from app.schemas.sieej.bases_datos import (
    BasesDatosCreate,
    BasesDatosResponse,
    BasesDatosUpdate,
    CatalogoEjeEstrategicoResponse,
)
from app.services.acervo import AcervoClient

SIEEJ_BUCKET_NAME = "sieej-diccionarios"


def _resolve_catalog(db: Session, model, value: str, label: str):
    if value is None:
        return None
    item = db.query(model).filter(model.value == value).first()
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{label} '{value}' no encontrado en el catálogo",
        )
    return item


class BasesDatosService:
    def __init__(self, db: Session):
        self.db = db

    def _get(self, user_id: int, bd_id: int | None = None) -> BasesDatos | None:
        query = self.db.query(BasesDatos).filter(
            BasesDatos.user_id == user_id, BasesDatos.is_active.is_(True)
        )
        if bd_id is not None:
            query = query.filter(BasesDatos.id == bd_id)
            return query.first()
        return query.first()

    def list(self, user_id: int) -> list[BasesDatosResponse]:
        items = (
            self.db.query(BasesDatos)
            .filter(BasesDatos.user_id == user_id, BasesDatos.is_active.is_(True))
            .order_by(BasesDatos.created_at.asc())
            .all()
        )
        return [self._format(item) for item in items]

    def get(self, bd_id: int, user_id: int) -> BasesDatosResponse | None:
        bd = self._get(user_id, bd_id)
        return self._format(bd) if bd else None

    def create(self, data: BasesDatosCreate, user_id: int) -> BasesDatosResponse:
        bd = BasesDatos(
            user_id=user_id,
            nombre_bd=data.nombre_bd,
            descripcion_bd=data.descripcion_bd,
        )
        self.db.add(bd)
        self.db.commit()
        self.db.refresh(bd)
        return self._format(bd)

    def update(self, bd_id: int, data: BasesDatosUpdate, user_id: int) -> BasesDatosResponse | None:
        bd = self._get(user_id, bd_id)
        if bd is None:
            return None

        cat = _resolve_catalog(self.db, CatalogoCategoriaDatos, data.categoria_datos, "Categoría de datos")
        her = _resolve_catalog(self.db, CatalogoHerramientasGestion, data.herramientas_gestion, "Herramienta de gestión")
        cal = _resolve_catalog(self.db, CatalogoCalidadDatos, data.calidad_datos, "Calidad de datos")
        per = _resolve_catalog(self.db, CatalogoPeriodicidad, data.periodicidad, "Periodicidad")
        obj = _resolve_catalog(self.db, CatalogoObjetivoUso, data.objetivo_uso, "Objetivo de uso")
        usu = _resolve_catalog(self.db, CatalogoUsuariosDatos, data.usuarios_datos, "Usuarios de datos")

        bd.categoria_datos_id = cat.id if cat else None
        bd.herramientas_gestion_id = her.id if her else None
        bd.calidad_datos_id = cal.id if cal else None
        bd.periodicidad_id = per.id if per else None
        bd.objetivo_uso_id = obj.id if obj else None
        bd.usuarios_datos_id = usu.id if usu else None

        if data.ejes_estrategicos is not None:
            ejes_objs = []
            for eje_value in data.ejes_estrategicos:
                eje = _resolve_catalog(
                    self.db, CatalogoEjesEstrategicos, eje_value, "Eje estratégico"
                )
                if eje is not None:
                    ejes_objs.append(eje)
            bd.ejes_estrategicos = ejes_objs

        for field in (
            "nombre_bd",
            "descripcion_bd",
            "limpieza_validacion",
            "desc_limpieza_validacion",
            "proveedores_bd",
            "desc_periodicidad",
            "tiene_diccionario",
            "quienes_son",
            "historicos",
            "desc_historicos",
            "migracion_actualizacion",
            "desc_migracion_actualizacion",
            "medidas_seguridad",
            "desc_medidas_seguridad",
            "normativas_proteccion",
            "desc_normativas_proteccion",
            "plan_contingencia",
            "desc_plan_contingencia",
            "interoperatividad",
            "desc_interoperatividad",
            "plataforma_difusion",
            "nombre_plataforma_difusion",
            "url_plataforma_difusion",
            "retos",
        ):
            setattr(bd, field, getattr(data, field))

        bd.updated_at = utcnow()
        self.db.commit()
        self.db.refresh(bd)
        return self._format(bd)

    def delete(self, bd_id: int, user_id: int) -> dict | None:
        bd = self._get(user_id, bd_id)
        if bd is None:
            return None
        bd.is_active = False
        bd.updated_at = utcnow()
        self.db.commit()
        return {"message": "Base de datos eliminada exitosamente"}

    async def upload_diccionario(
        self, bd_id: int, user_id: int, file: UploadFile
    ) -> BasesDatosResponse | None:
        bd = self._get(user_id, bd_id)
        if bd is None:
            return None

        bucket = (
            self.db.query(MediaBucket)
            .join(Project, Project.id == MediaBucket.project_id)
            .filter(
                Project.slug == "sieej",
                MediaBucket.acervo_bucket == SIEEJ_BUCKET_NAME,
                MediaBucket.is_active.is_(True),
            )
            .first()
        )
        if bucket is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Bucket Acervo '{SIEEJ_BUCKET_NAME}' no configurado",
            )

        client = AcervoClient.for_bucket(bucket)
        ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else ""
        object_name = (
            f"u{user_id}/bd{bd_id}/{uuid.uuid4()}.{ext}"
            if ext
            else f"u{user_id}/bd{bd_id}/{uuid.uuid4()}"
        )

        url = await client.upload_file(file, object_name)

        bd.ruta_diccionario = url
        bd.tiene_diccionario = True
        bd.updated_at = utcnow()
        self.db.commit()
        self.db.refresh(bd)
        return self._format(bd)

    def _format(self, bd: BasesDatos) -> BasesDatosResponse:
        return BasesDatosResponse(
            id=bd.id,
            user_id=bd.user_id,
            nombre_bd=bd.nombre_bd,
            descripcion_bd=bd.descripcion_bd,
            categoria_datos=bd.categoria_datos.value if bd.categoria_datos else None,
            herramientas_gestion=bd.herramientas_gestion.value if bd.herramientas_gestion else None,
            calidad_datos=bd.calidad_datos.value if bd.calidad_datos else None,
            periodicidad=bd.periodicidad.value if bd.periodicidad else None,
            objetivo_uso=bd.objetivo_uso.value if bd.objetivo_uso else None,
            usuarios_datos=bd.usuarios_datos.value if bd.usuarios_datos else None,
            ejes_estrategicos=[
                CatalogoEjeEstrategicoResponse.model_validate(e) for e in bd.ejes_estrategicos
            ],
            limpieza_validacion=bd.limpieza_validacion,
            desc_limpieza_validacion=bd.desc_limpieza_validacion,
            proveedores_bd=bd.proveedores_bd,
            desc_periodicidad=bd.desc_periodicidad,
            tiene_diccionario=bd.tiene_diccionario,
            ruta_diccionario=bd.ruta_diccionario,
            quienes_son=bd.quienes_son,
            historicos=bd.historicos,
            desc_historicos=bd.desc_historicos,
            migracion_actualizacion=bd.migracion_actualizacion,
            desc_migracion_actualizacion=bd.desc_migracion_actualizacion,
            medidas_seguridad=bd.medidas_seguridad,
            desc_medidas_seguridad=bd.desc_medidas_seguridad,
            normativas_proteccion=bd.normativas_proteccion,
            desc_normativas_proteccion=bd.desc_normativas_proteccion,
            plan_contingencia=bd.plan_contingencia,
            desc_plan_contingencia=bd.desc_plan_contingencia,
            interoperatividad=bd.interoperatividad,
            desc_interoperatividad=bd.desc_interoperatividad,
            plataforma_difusion=bd.plataforma_difusion,
            nombre_plataforma_difusion=bd.nombre_plataforma_difusion,
            url_plataforma_difusion=bd.url_plataforma_difusion,
            retos=bd.retos,
        )
