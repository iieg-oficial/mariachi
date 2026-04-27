from sqlalchemy.orm import Session

from app.core.time import utcnow
from app.models.sieej import Enlace
from app.schemas.sieej.enlace import EnlaceCreate, EnlaceResponse, EnlaceUpdate


class EnlaceService:
    def __init__(self, db: Session):
        self.db = db

    def _get(self, user_id: int, enlace_id: int | None = None) -> Enlace | None:
        return (
            self.db.query(Enlace)
            .filter(Enlace.user_id == user_id, Enlace.is_active.is_(True), Enlace.id == enlace_id)
            .first()
        )

    def list(self, user_id: int) -> list[EnlaceResponse]:
        enlaces = (
            self.db.query(Enlace)
            .filter(Enlace.user_id == user_id, Enlace.is_active.is_(True))
            .order_by(Enlace.created_at.asc())
            .all()
        )
        return [EnlaceResponse.model_validate(e) for e in enlaces]

    def create(self, data: EnlaceCreate, user_id: int) -> EnlaceResponse:
        enlace = Enlace(user_id=user_id, **data.model_dump())
        self.db.add(enlace)
        self.db.commit()
        self.db.refresh(enlace)
        return EnlaceResponse.model_validate(enlace)

    def update(self, enlace_id: int, data: EnlaceUpdate, user_id: int) -> EnlaceResponse | None:
        enlace = self._get(user_id, enlace_id)
        if enlace is None:
            return None
        for field, value in data.model_dump().items():
            setattr(enlace, field, value)
        enlace.updated_at = utcnow()
        self.db.commit()
        self.db.refresh(enlace)
        return EnlaceResponse.model_validate(enlace)

    def delete(self, enlace_id: int, user_id: int) -> dict | None:
        enlace = self._get(user_id, enlace_id)
        if enlace is None:
            return None
        enlace.is_active = False
        enlace.updated_at = utcnow()
        self.db.commit()
        return {"message": "Enlace eliminado exitosamente"}
