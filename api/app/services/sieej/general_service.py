from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.sieej import CatalogoUnidadAdmin, General
from app.schemas.sieej.general import GeneralCreate, GeneralResponse, GeneralUpdate


class GeneralService:
    def __init__(self, db: Session):
        self.db = db

    def _get(self, user_id: int, general_id: Optional[int] = None) -> Optional[General]:
        query = self.db.query(General).filter(General.user_id == user_id, General.is_active.is_(True))
        if general_id is not None:
            query = query.filter(General.id == general_id)
            return query.first()
        return query.first()

    def _resolve_unidad_admin(self, value: str) -> CatalogoUnidadAdmin:
        unidad = (
            self.db.query(CatalogoUnidadAdmin)
            .filter(CatalogoUnidadAdmin.value == value)
            .first()
        )
        if unidad is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unidad administrativa '{value}' no encontrada",
            )
        return unidad

    def get(self, user_id: int) -> Optional[GeneralResponse]:
        general = self._get(user_id)
        if general is None:
            return None
        return self._format(general)

    def create(self, data: GeneralCreate, user_id: int) -> GeneralResponse:
        unidad = self._resolve_unidad_admin(data.unidad_admin)
        general = General(
            user_id=user_id,
            unidad_admin_id=unidad.id,
            nombre_ente_gobierno=data.nombre_ente_gobierno,
            hay_responsable=data.hay_responsable,
            descripcion_hay_responsable=data.descripcion_hay_responsable,
            desafios_oportunidades=data.desafios_oportunidades,
        )
        self.db.add(general)
        self.db.commit()
        self.db.refresh(general)
        return self._format(general)

    def update(self, general_id: int, data: GeneralUpdate, user_id: int) -> Optional[GeneralResponse]:
        general = self._get(user_id, general_id)
        if general is None:
            return None
        unidad = self._resolve_unidad_admin(data.unidad_admin)
        general.unidad_admin_id = unidad.id
        general.nombre_ente_gobierno = data.nombre_ente_gobierno
        general.hay_responsable = data.hay_responsable
        general.descripcion_hay_responsable = data.descripcion_hay_responsable
        general.desafios_oportunidades = data.desafios_oportunidades
        general.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(general)
        return self._format(general)

    def delete(self, general_id: int, user_id: int) -> Optional[dict]:
        general = self._get(user_id, general_id)
        if general is None:
            return None
        general.is_active = False
        general.updated_at = datetime.utcnow()
        self.db.commit()
        return {"message": "Información general eliminada exitosamente"}

    def _format(self, general: General) -> GeneralResponse:
        return GeneralResponse(
            id=general.id,
            unidad_admin=general.unidad_admin.value if general.unidad_admin else "",
            nombre_ente_gobierno=general.nombre_ente_gobierno,
            hay_responsable=general.hay_responsable,
            descripcion_hay_responsable=general.descripcion_hay_responsable,
            desafios_oportunidades=general.desafios_oportunidades,
        )
