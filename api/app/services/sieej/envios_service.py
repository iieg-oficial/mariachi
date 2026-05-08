"""Servicio de envios (CRUD del envio activo + upload de archivos).

Un envio se crea implicitamente la primera vez que el respondent guarda
o consulta el formulario (lazy init), y queda con
`definicion_snapshot` = la definicion vigente del formulario al iniciar.
Cambios futuros del formulario no afectan envios existentes.
"""
from __future__ import annotations

import uuid
from typing import Any

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.time import utcnow
from app.models.media_bucket import MediaBucket
from app.models.project import Project
from app.models.sieej import (
    EnvioArchivo,
    EnvioEvento,
    EnvioFormulario,
    Formulario,
)
from app.models.user import Usuario
from app.services.acervo import AcervoClient
from app.services.sieej.datos_validator import DatosInvalidosError, validar_datos


_FORMULARIO_NO_ACEPTA_DETAIL = (
    "El formulario esta cerrado y no acepta cambios"
)


def _marcar_expirado(envio: EnvioFormulario, db: Session, ahora) -> None:
    envio.estado = "expirado"
    envio.expirado_en = ahora
    db.add(
        EnvioEvento(
            envio_id=envio.id,
            tipo="expirado",
            actor_usuario_id=None,
        )
    )


class EnviosService:
    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def _formulario_acepta_cambios(formulario: Formulario) -> bool:
        """True si el formulario admite escritura por el respondent."""
        if formulario.estado != "activo":
            return False
        ahora = utcnow()
        if formulario.vigencia_inicio and formulario.vigencia_inicio > ahora:
            return False
        if formulario.vigencia_fin and formulario.vigencia_fin < ahora:
            return False
        return True

    def _expirar_si_corresponde(
        self,
        envio: EnvioFormulario,
        formulario: Formulario | None = None,
        commit: bool = True,
    ) -> bool:
        """Si el envio en_proceso esta fuera de vigencia, marcarlo expirado.

        Lazy expiration: como el sistema no corre un cron, la transicion
        `en_proceso` -> `expirado` se aplica cuando un endpoint toca el
        envio. Es idempotente y barato (1 query opcional + 1 update).
        Devuelve True si se cambio el estado.
        """
        if envio.estado != "en_proceso":
            return False
        if formulario is None:
            formulario = (
                self.db.query(Formulario)
                .filter(Formulario.id == envio.formulario_id)
                .first()
            )
        if formulario is None:
            return False
        if formulario.vigencia_fin is None:
            return False
        ahora = utcnow()
        if formulario.vigencia_fin >= ahora:
            return False
        _marcar_expirado(envio, self.db, ahora)
        if commit:
            self.db.commit()
            self.db.refresh(envio)
        return True

    def expirar_pendientes_bulk(self) -> int:
        """Marca como expirado todo `en_proceso` cuyo formulario paso vigencia.

        Para correr desde un endpoint admin de mantenimiento. Devuelve el
        numero de envios afectados.
        """
        ahora = utcnow()
        pendientes = (
            self.db.query(EnvioFormulario)
            .join(Formulario, Formulario.id == EnvioFormulario.formulario_id)
            .filter(
                EnvioFormulario.estado == "en_proceso",
                Formulario.vigencia_fin.isnot(None),
                Formulario.vigencia_fin < ahora,
            )
            .all()
        )
        for envio in pendientes:
            _marcar_expirado(envio, self.db, ahora)
        if pendientes:
            self.db.commit()
        return len(pendientes)

    def get_o_iniciar(
        self,
        formulario: Formulario,
        user: Usuario,
        *,
        crear_si_falta: bool = True,
    ) -> EnvioFormulario | None:
        envio = (
            self.db.query(EnvioFormulario)
            .filter(
                EnvioFormulario.formulario_id == formulario.id,
                EnvioFormulario.usuario_id == user.id,
            )
            .first()
        )
        if envio is not None:
            return envio
        if not crear_si_falta:
            return None
        if not self._formulario_acepta_cambios(formulario):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=_FORMULARIO_NO_ACEPTA_DETAIL,
            )
        envio = EnvioFormulario(
            formulario_id=formulario.id,
            formulario_version=formulario.version,
            definicion_snapshot=formulario.definicion,
            usuario_id=user.id,
            estado="en_proceso",
            datos={},
            paso_actual=0,
        )
        self.db.add(envio)
        self.db.flush()
        self._registrar_evento(envio, "iniciado", actor=user)
        self.db.commit()
        self.db.refresh(envio)
        return envio

    def actualizar(
        self,
        formulario: Formulario,
        user: Usuario,
        datos: dict[str, Any],
        paso_actual: int,
        *,
        enviar: bool,
    ) -> EnvioFormulario:
        if not self._formulario_acepta_cambios(formulario):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=_FORMULARIO_NO_ACEPTA_DETAIL,
            )
        envio = self.get_o_iniciar(formulario, user)
        if envio.estado == "expirado":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El envio esta expirado y no puede modificarse",
            )
        if envio.estado == "enviado":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El envio ya fue enviado y no puede modificarse",
            )

        try:
            validar_datos(envio.definicion_snapshot, datos, estricto=enviar)
        except DatosInvalidosError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"errores": exc.errores},
            ) from exc

        envio.datos = datos
        envio.paso_actual = paso_actual
        if enviar:
            envio.estado = "enviado"
            envio.enviado_en = utcnow()
            self._registrar_evento(envio, "enviado", actor=user)
        else:
            self._registrar_evento(envio, "guardado", actor=user)
        envio.actualizado_en = utcnow()
        self.db.commit()
        self.db.refresh(envio)
        return envio

    async def upload_archivo(
        self,
        formulario: Formulario,
        user: Usuario,
        field_path: str,
        file: UploadFile,
    ) -> EnvioArchivo:
        if not self._formulario_acepta_cambios(formulario):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=_FORMULARIO_NO_ACEPTA_DETAIL,
            )
        envio = self.get_o_iniciar(formulario, user)
        if envio.estado in {"enviado", "expirado"}:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El envio no acepta cambios",
            )

        bucket_name = self._bucket_para_field(envio.definicion_snapshot, field_path)
        if bucket_name is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"field_path '{field_path}' no es un campo `file` valido",
            )

        bucket = (
            self.db.query(MediaBucket)
            .join(Project, Project.id == MediaBucket.project_id)
            .filter(
                MediaBucket.acervo_bucket == bucket_name,
                MediaBucket.is_active.is_(True),
            )
            .first()
        )
        if bucket is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Bucket Acervo '{bucket_name}' no configurado",
            )

        ext = (
            file.filename.rsplit(".", 1)[-1]
            if file.filename and "." in file.filename
            else ""
        )
        object_key = (
            f"envio{envio.id}/{uuid.uuid4()}.{ext}"
            if ext
            else f"envio{envio.id}/{uuid.uuid4()}"
        )

        client = AcervoClient.for_bucket(bucket)
        url = await client.upload_file(file, object_key)

        size = 0
        if hasattr(file, "size") and file.size is not None:
            size = file.size
        else:
            await file.seek(0, 2)
            size = await file.tell() if hasattr(file, "tell") else 0
            await file.seek(0)

        archivo = EnvioArchivo(
            envio_id=envio.id,
            field_path=field_path,
            bucket=bucket_name,
            object_key=object_key,
            url_publica=url,
            filename_original=file.filename or "",
            mime=file.content_type or "application/octet-stream",
            size_bytes=size,
        )
        self.db.add(archivo)
        envio.actualizado_en = utcnow()
        self.db.commit()
        self.db.refresh(archivo)
        return archivo

    def _bucket_para_field(
        self, definicion: dict[str, Any], field_path: str
    ) -> str | None:
        """Resuelve el bucket de un field_path como `step.field` o
        `step[idx].field` (repeater).
        """
        partes = field_path.split(".")
        if len(partes) != 2:
            return None
        step_part, field_name = partes
        step_id = step_part.split("[", 1)[0]
        for step in definicion.get("steps", []):
            if step.get("id") != step_id:
                continue
            for field in step.get("fields", []):
                if field.get("name") == field_name and field.get("type") == "file":
                    return field.get("bucket")
        return None

    def _registrar_evento(
        self,
        envio: EnvioFormulario,
        tipo: str,
        *,
        actor: Usuario | None = None,
        payload: dict[str, Any] | None = None,
    ) -> None:
        evento = EnvioEvento(
            envio_id=envio.id,
            tipo=tipo,
            payload=payload,
            actor_usuario_id=actor.id if actor else None,
        )
        self.db.add(evento)

    # ------------------------------------------------------------------
    # Endpoints respondent: "Mis envios"
    # ------------------------------------------------------------------

    SORT_OPTIONS = {"-actualizado_en", "-enviado_en", "nombre"}

    def listar_mis_envios(
        self,
        user: Usuario,
        *,
        estado: str | None = None,
        q: str | None = None,
        page: int = 1,
        page_size: int = 20,
        sort: str = "-actualizado_en",
    ) -> tuple[list[EnvioFormulario], int]:
        """Listado paginado de los envios del propio usuario.

        - Filtra siempre por usuario_id == user.id (NUNCA acepta override).
        - estado opcional: en_proceso | enviado | expirado.
        - q opcional: busqueda en formulario.slug y formulario.nombre.
        - sort: -actualizado_en (default), -enviado_en, nombre.
        """
        query = (
            self.db.query(EnvioFormulario)
            .join(Formulario, Formulario.id == EnvioFormulario.formulario_id)
            .filter(EnvioFormulario.usuario_id == user.id)
        )
        if estado is not None:
            query = query.filter(EnvioFormulario.estado == estado)
        if q:
            like = f"%{q}%"
            query = query.filter(
                Formulario.slug.ilike(like) | Formulario.nombre.ilike(like)
            )

        total = query.count()

        sort_key = sort if sort in self.SORT_OPTIONS else "-actualizado_en"
        if sort_key == "-actualizado_en":
            query = query.order_by(EnvioFormulario.actualizado_en.desc())
        elif sort_key == "-enviado_en":
            # Portable NULLS LAST: los no-enviados al final.
            query = query.order_by(
                EnvioFormulario.enviado_en.is_(None).asc(),
                EnvioFormulario.enviado_en.desc(),
            )
        else:  # "nombre"
            query = query.order_by(Formulario.nombre.asc())

        page = max(page, 1)
        page_size = max(min(page_size, 100), 1)
        offset = (page - 1) * page_size
        items = query.offset(offset).limit(page_size).all()

        ahora = utcnow()
        cambios = False
        for item in items:
            if item.estado != "en_proceso":
                continue
            f = next(
                (f for f in (item.formulario,) if f is not None),
                None,
            )
            if f and f.vigencia_fin and f.vigencia_fin < ahora:
                _marcar_expirado(item, self.db, ahora)
                cambios = True
        if cambios:
            self.db.commit()

        return items, total

    def obtener_mi_envio_detalle(
        self,
        user: Usuario,
        envio_id: int,
    ) -> EnvioFormulario:
        """Detalle de un envio del propio usuario.

        - 404 si no existe.
        - 403 si pertenece a otro usuario (no 404 para no filtrar existencia).
        """
        envio = (
            self.db.query(EnvioFormulario)
            .filter(EnvioFormulario.id == envio_id)
            .first()
        )
        if envio is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Envio no encontrado",
            )
        if envio.usuario_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Este envio no te pertenece",
            )
        self._expirar_si_corresponde(envio)
        return envio
