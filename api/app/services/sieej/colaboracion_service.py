"""Captura simultanea por campo sobre un envio de grupo.

El merge sobre `envio.datos` es parcial y el historial que produce es el que
alimenta la autoria por campo. La resolucion de a que grupo pertenece cada
envio vive en `pertenencia.py`.
"""
from __future__ import annotations

import json
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.core.time import utcnow
from app.models.sieej import EnvioFormulario, EnvioValorHistorial, Formulario
from app.models.user import Usuario
from app.services import presence

PRESENCIA_SCOPE = "sieej_envio"


class ColaboracionService:
    """Captura simultanea sobre un envio `en_proceso`.

    El merge es por campo y el conflicto tambien: si `desde` viene atrasado el
    PATCH se aplica igual, y solo hay 409 cuando otro miembro toco **alguno de
    los mismos** `field_path` despues de `desde`. Un 409 por envio completo
    haria inusable la captura simultanea, que es justo lo que esto habilita.

    Cuando hay conflicto no se escribe nada: el lote entero se rechaza con los
    dos valores de cada campo en disputa para que el cliente decida y reintente.
    """

    def __init__(self, db: Session):
        self.db = db

    def capturar(
        self,
        user: Usuario,
        envio_id: int,
        campos: dict[str, Any],
        desde: int,
    ) -> dict[str, Any]:
        from app.services.sieej import campos_service
        from app.services.sieej.datos_validator import (
            DatosInvalidosError,
            validar_datos,
        )
        from app.services.sieej.envios_service import DATOS_MAX_BYTES, EnviosService

        envios = EnviosService(self.db)
        envio = (
            self.db.query(EnvioFormulario)
            .filter(EnvioFormulario.id == envio_id)
            .with_for_update()
            .first()
        )
        if envio is None or envio.eliminado_en is not None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Envio no encontrado"
            )
        if not envios.puede_editar_envio(user, envio):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Este envio no te pertenece",
            )
        formulario = (
            self.db.query(Formulario)
            .filter(Formulario.id == envio.formulario_id)
            .first()
        )
        if formulario is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Formulario no encontrado",
            )
        if envio.estado != "en_proceso":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Solo un envio en proceso admite captura por campos",
            )
        if not EnviosService._formulario_acepta_cambios(formulario):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El formulario esta cerrado y no acepta cambios",
            )

        defs = campos_service.field_defs(
            envio.definicion_snapshot or {}, solo_editables=False
        )
        _metas, errores = campos_service.validar_paths(
            defs,
            envio.datos or {},
            campos,
            detalle_no_permitido="el campo no existe en el formulario",
        )
        if errores:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail={"errores": errores},
            )

        conflictos = self._conflictos(envio, campos, desde, user)
        if conflictos:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"codigo": "conflicto_por_campo", "campos": conflictos},
            )

        nuevos, cambios = campos_service.aplicar_cambios(envio.datos or {}, campos)
        if cambios:
            payload_bytes = len(json.dumps(nuevos, default=str).encode("utf-8"))
            if payload_bytes > DATOS_MAX_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                    detail=(
                        f"`datos` excede el limite de "
                        f"{DATOS_MAX_BYTES // (1024 * 1024)} MB"
                    ),
                )
            try:
                validar_datos(envio.definicion_snapshot, nuevos, estricto=False)
            except DatosInvalidosError as exc:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail={"errores": exc.errores},
                ) from exc

            envio.datos = nuevos
            flag_modified(envio, "datos")
            envio.datos_version += 1
            campos_service.registrar_historial(
                self.db, envio, cambios, defs, actor=user, origen="captura"
            )
            envio.actualizado_en = utcnow()
            envios._registrar_evento(
                envio,
                "actualizado",
                actor=user,
                payload={"campos": [c[0] for c in cambios], "n": len(cambios)},
            )
            self.db.commit()
            self.db.refresh(envio)

        return {
            "datos_version": envio.datos_version,
            "estado": envio.estado,
            "cambios": self.delta(envio, desde),
        }

    def _historial_desde(
        self,
        envio: EnvioFormulario,
        desde: int,
        *,
        paths: list[str] | None = None,
        excluir_actor: int | None = None,
    ) -> list[tuple[EnvioValorHistorial, str | None]]:
        query = (
            self.db.query(EnvioValorHistorial, Usuario.name)
            .outerjoin(Usuario, Usuario.id == EnvioValorHistorial.actor_usuario_id)
            .filter(
                EnvioValorHistorial.envio_id == envio.id,
                EnvioValorHistorial.datos_version > desde,
            )
        )
        if paths is not None:
            query = query.filter(EnvioValorHistorial.field_path.in_(paths))
        if excluir_actor is not None:
            query = query.filter(
                EnvioValorHistorial.actor_usuario_id != excluir_actor
            )
        return query.order_by(EnvioValorHistorial.cambiado_en.asc()).all()

    def sync(
        self,
        user: Usuario,
        envio: EnvioFormulario,
        desde: int,
        seccion: str | None,
        *,
        salir: bool = False,
    ) -> dict[str, Any]:
        """Latido, delta y presencia en una sola llamada.

        Van juntos a proposito: el gateway limita por IP y un equipo de una
        dependencia sale por la misma NAT, asi que tres endpoints de polling
        gastarian el triple de la cuota que comparten.

        La presencia es un aviso, no un candado: si Redis no responde el sync
        sigue devolviendo el delta y la captura no se entera.
        """
        if salir:
            presence.salir(PRESENCIA_SCOPE, envio.id, user.username)
        else:
            presence.entrar(
                PRESENCIA_SCOPE,
                envio.id,
                user.username,
                user.name,
                avatar_url=user.avatar_url,
                seccion=seccion,
            )
        return {
            "datos_version": envio.datos_version,
            "estado": envio.estado,
            "cambios": self.delta(envio, desde),
            "presentes": (
                []
                if salir
                else presence.presentes(
                    PRESENCIA_SCOPE, envio.id, excluir=user.username
                )
            ),
        }

    def autoria_por_campo(self, envio: EnvioFormulario) -> dict[str, dict[str, Any]]:
        """Ultima autoria de cada campo del envio.

        Se resuelve en Python y no con un `DISTINCT ON`: el historial de un
        envio es acotado —el coalescing lo mantiene asi— y los tests corren
        sobre SQLite, que no tiene esa clausula.
        """
        filas = (
            self.db.query(EnvioValorHistorial, Usuario.name)
            .outerjoin(Usuario, Usuario.id == EnvioValorHistorial.actor_usuario_id)
            .filter(EnvioValorHistorial.envio_id == envio.id)
            .order_by(EnvioValorHistorial.cambiado_en.asc())
            .all()
        )
        de_grupo = envio.grupo_id is not None
        autoria: dict[str, dict[str, Any]] = {}
        for fila, actor_nombre in filas:
            autoria[fila.field_path] = {
                "actor_nombre": actor_nombre if de_grupo else None,
                "cambiado_en": fila.cambiado_en,
            }
        return autoria

    def delta(self, envio: EnvioFormulario, desde: int) -> list[dict[str, Any]]:
        """Ultimo valor de cada campo tocado despues de `desde`, con su autor."""
        por_campo: dict[str, dict[str, Any]] = {}
        for fila, actor_nombre in self._historial_desde(envio, desde):
            por_campo[fila.field_path] = {
                "field_path": fila.field_path,
                "valor_nuevo": fila.valor_nuevo,
                "actor_nombre": actor_nombre,
                "cambiado_en": fila.cambiado_en,
            }
        return list(por_campo.values())

    def _conflictos(
        self,
        envio: EnvioFormulario,
        campos: dict[str, Any],
        desde: int,
        user: Usuario,
    ) -> list[dict[str, Any]]:
        if not campos:
            return []
        filas = self._historial_desde(
            envio, desde, paths=list(campos), excluir_actor=user.id
        )
        por_campo: dict[str, dict[str, Any]] = {}
        for fila, actor_nombre in filas:
            if fila.valor_nuevo == campos[fila.field_path]:
                continue
            por_campo[fila.field_path] = {
                "field_path": fila.field_path,
                "valor_tuyo": campos[fila.field_path],
                "valor_actual": fila.valor_nuevo,
                "actor_nombre": actor_nombre,
                "cambiado_en": (
                    fila.cambiado_en.isoformat() if fila.cambiado_en else None
                ),
            }
        return list(por_campo.values())
