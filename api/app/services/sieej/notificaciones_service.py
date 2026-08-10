"""Avisos de formularios periodicos: apertura y faltantes.

Al abrir una ventana se avisa al creador del formulario (webhook) y los
respondents se enteran in-app (el formulario aparece «abierto» en su lista).
Al cerrar la ventana se avisa de los faltantes al creador y a los
administradores (staff del IIEG). Cada aviso se registra en `sieej.notificacion`
(bitacora exportable a CSV/XLSX) y, best-effort, se publica en el webhook de
Discord/Slack de SIEEJ. El webhook nunca levanta: un fallo de red no debe
tumbar el `tick` del cron.
"""
from __future__ import annotations

import csv
import logging
from datetime import datetime
from io import BytesIO, StringIO
from typing import Any

import httpx
from openpyxl import Workbook
from openpyxl.styles import Font
from sqlalchemy.orm import Session

from app.core.settings import get_settings
from app.core.time import utcnow
from app.models.sieej import (
    EnvioFormulario,
    Formulario,
    FormularioPeriodo,
    Notificacion,
    formulario_grupo,
    formulario_usuario,
    usuario_grupo,
)
from app.models.user import Usuario

logger = logging.getLogger(__name__)

_ROLES_DESTINATARIOS = ("tetlamamakani", "editora")

_TIPO_LABEL = {
    "apertura": "Apertura de ventana",
    "faltantes": "Faltantes al cierre",
}


def _fmt(dt: datetime | None) -> str:
    return dt.strftime("%Y-%m-%d %H:%M") if dt else ""


def _ref(user: Usuario | None) -> dict[str, Any] | None:
    if user is None:
        return None
    return {"id": user.id, "name": user.name, "email": user.email}


def _csv_bytes(headers: list[Any], rows: list[list[Any]]) -> bytes:
    sio = StringIO()
    writer = csv.writer(sio)
    writer.writerow(headers)
    writer.writerows(rows)
    return sio.getvalue().encode("utf-8-sig")


def _xlsx_bytes(title: str, headers: list[Any], rows: list[list[Any]]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = (title or "Datos")[:31]
    ws.append(headers)
    for cell in ws[1]:
        cell.font = Font(bold=True)
    for row in rows:
        ws.append(row)
    bio = BytesIO()
    wb.save(bio)
    return bio.getvalue()


class NotificacionesService:
    def __init__(self, db: Session):
        self.db = db

    # ------------------------------------------------------------------
    # Avisos
    # ------------------------------------------------------------------

    def notificar_apertura(self, periodo: FormularioPeriodo) -> Notificacion:
        formulario = self._formulario(periodo)
        asignados = self._asignados_ids(formulario.id)
        creador = self._usuario(formulario.creado_por_id)
        resumen = (
            f"Se abrio la ventana «{periodo.clave}» de «{formulario.nombre}» "
            f"({_fmt(periodo.apertura)} – {_fmt(periodo.cierre)})."
        )
        destinatarios = {
            "creador": _ref(creador),
            "respondents_asignados": len(asignados),
        }
        payload = {
            "clave": periodo.clave,
            "apertura": periodo.apertura.isoformat() if periodo.apertura else None,
            "cierre": periodo.cierre.isoformat() if periodo.cierre else None,
        }
        noti = self._registrar(
            formulario.id, periodo.id, "apertura", resumen, payload, destinatarios
        )
        self._webhook(f"🟢 {formulario.nombre}", resumen, 0x2ECC71)
        return noti

    def notificar_faltantes(self, periodo: FormularioPeriodo) -> Notificacion:
        formulario = self._formulario(periodo)
        asignados = self._asignados_ids(formulario.id)
        entregaron = self._entregaron_ids(periodo.id)
        faltantes_ids = sorted(asignados - entregaron)
        faltantes = (
            [
                _ref(u)
                for u in self.db.query(Usuario)
                .filter(Usuario.id.in_(faltantes_ids))
                .all()
            ]
            if faltantes_ids
            else []
        )
        creador = self._usuario(formulario.creado_por_id)
        admins = [_ref(u) for u in self._staff()]
        resumen = (
            f"Cerro la ventana «{periodo.clave}» de «{formulario.nombre}»: "
            f"{len(faltantes)} de {len(asignados)} sin entregar."
        )
        destinatarios = {"creador": _ref(creador), "admins": admins}
        payload = {
            "clave": periodo.clave,
            "total_asignados": len(asignados),
            "entregados": len(asignados) - len(faltantes),
            "faltantes": faltantes,
        }
        noti = self._registrar(
            formulario.id, periodo.id, "faltantes", resumen, payload, destinatarios
        )
        self._webhook(f"🔴 {formulario.nombre}", resumen, 0xE74C3C)
        return noti

    # ------------------------------------------------------------------
    # Bitacora / export
    # ------------------------------------------------------------------

    def listar(self, formulario_id: int) -> list[Notificacion]:
        return (
            self.db.query(Notificacion)
            .filter(Notificacion.formulario_id == formulario_id)
            .order_by(Notificacion.enviado_en.desc())
            .all()
        )

    def exportar(
        self, formulario_id: int, formato: str
    ) -> tuple[bytes, str, str]:
        """Bitacora de comunicaciones como `(contenido, media_type, ext)`."""
        headers = [
            "Fecha",
            "Tipo",
            "Periodo",
            "Resumen",
            "Asignados",
            "Faltantes",
        ]
        rows: list[list[Any]] = []
        for noti in self.listar(formulario_id):
            payload = noti.payload or {}
            faltantes = payload.get("faltantes") or []
            rows.append(
                [
                    _fmt(noti.enviado_en),
                    _TIPO_LABEL.get(noti.tipo, noti.tipo),
                    payload.get("clave", ""),
                    noti.resumen,
                    payload.get("total_asignados", ""),
                    len(faltantes) if noti.tipo == "faltantes" else "",
                ]
            )
        if formato == "csv":
            return _csv_bytes(headers, rows), "text/csv", "csv"
        return (
            _xlsx_bytes("Comunicaciones", headers, rows),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "xlsx",
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _formulario(self, periodo: FormularioPeriodo) -> Formulario:
        return (
            self.db.query(Formulario)
            .filter(Formulario.id == periodo.formulario_id)
            .first()
        )

    def _usuario(self, usuario_id: int | None) -> Usuario | None:
        if usuario_id is None:
            return None
        return self.db.query(Usuario).filter(Usuario.id == usuario_id).first()

    def _staff(self) -> list[Usuario]:
        return (
            self.db.query(Usuario)
            .filter(Usuario.role.in_(_ROLES_DESTINATARIOS))
            .all()
        )

    def _asignados_ids(self, formulario_id: int) -> set[int]:
        directos = (
            self.db.query(formulario_usuario.c.usuario_id)
            .filter(formulario_usuario.c.formulario_id == formulario_id)
            .all()
        )
        via_grupo = (
            self.db.query(usuario_grupo.c.usuario_id)
            .join(
                formulario_grupo,
                formulario_grupo.c.grupo_id == usuario_grupo.c.grupo_id,
            )
            .filter(formulario_grupo.c.formulario_id == formulario_id)
            .all()
        )
        return {r[0] for r in directos} | {r[0] for r in via_grupo}

    def _entregaron_ids(self, periodo_id: int) -> set[int]:
        rows = (
            self.db.query(EnvioFormulario.usuario_id)
            .filter(
                EnvioFormulario.periodo_id == periodo_id,
                EnvioFormulario.estado == "enviado",
            )
            .all()
        )
        return {r[0] for r in rows if r[0] is not None}

    def _registrar(
        self,
        formulario_id: int,
        periodo_id: int,
        tipo: str,
        resumen: str,
        payload: dict[str, Any],
        destinatarios: dict[str, Any],
    ) -> Notificacion:
        noti = Notificacion(
            formulario_id=formulario_id,
            periodo_id=periodo_id,
            tipo=tipo,
            resumen=resumen,
            payload=payload,
            destinatarios=destinatarios,
            enviado_en=utcnow(),
        )
        self.db.add(noti)
        self.db.flush()
        return noti

    def _webhook(self, titulo: str, resumen: str, color: int) -> None:
        webhook = get_settings().discord_webhook_sieej
        if not webhook:
            return
        embed = {"title": titulo, "description": resumen, "color": color}
        try:
            with httpx.Client(timeout=5.0) as client:
                client.post(webhook, json={"embeds": [embed]})
        except httpx.HTTPError:
            logger.exception("sieej.notificacion webhook fallo")
