from __future__ import annotations

import re
from collections.abc import Iterable, Iterator
from dataclasses import dataclass, field
from typing import Any, Protocol
from urllib.parse import unquote

from sqlalchemy.orm import Session

from app.models.acervo_bucket import AcervoBucket
from app.services import tipo_archivo
from app.services.acervo import AcervoClient, build_content_disposition

BUCKETS_EXCLUIDOS = frozenset({"portal"})

_CABECERAS_CONSERVADAS = ("cache-control", "content-language", "content-encoding")
_FILENAME_UTF8 = re.compile(r"filename\*=UTF-8''([^;]+)", re.IGNORECASE)
_FILENAME = re.compile(r'filename="([^"]*)"', re.IGNORECASE)

CAMPOS = (
    "bucket",
    "objeto",
    "tamano",
    "guardado",
    "real",
    "por_extension",
    "disposicion",
    "motivos",
    "nuevo_tipo",
    "nueva_disposicion",
    "accion",
)


class ClienteBarrido(Protocol):
    bucket_name: str

    def list_objects(
        self, prefix: str = "", recursive: bool = True, limit: int | None = None
    ) -> list[dict]: ...

    def stat_object(self, object_name: str) -> Any: ...

    def leer_cabecera(self, object_name: str, length: int = ...) -> bytes: ...

    def reescribir_metadatos(self, object_name: str, metadata: dict[str, str]) -> None: ...


@dataclass
class Hallazgo:
    bucket: str
    objeto: str
    tamano: int
    guardado: str
    real: str
    por_extension: str
    disposicion: str
    motivos: list[str]
    nuevo_tipo: str
    nueva_disposicion: str
    accion: str = "reporte"

    def fila(self) -> dict[str, str | int]:
        return {
            "bucket": self.bucket,
            "objeto": self.objeto,
            "tamano": self.tamano,
            "guardado": self.guardado,
            "real": self.real,
            "por_extension": self.por_extension,
            "disposicion": self.disposicion,
            "motivos": "|".join(self.motivos),
            "nuevo_tipo": self.nuevo_tipo,
            "nueva_disposicion": self.nueva_disposicion,
            "accion": self.accion,
        }


@dataclass
class Resumen:
    buckets: list[str] = field(default_factory=list)
    revisados: int = 0
    hallazgos: int = 0
    corregidos: int = 0
    errores: int = 0


def _normalizar(mime: str | None) -> str:
    return (mime or "").split(";", 1)[0].strip().lower()


def _metadatos(stat: Any) -> dict[str, str]:
    return {str(k).lower(): str(v) for k, v in (getattr(stat, "metadata", None) or {}).items()}


def _nombre_descarga(disposicion: str, objeto: str) -> str:
    utf8 = _FILENAME_UTF8.search(disposicion)
    if utf8:
        return unquote(utf8.group(1).strip())
    simple = _FILENAME.search(disposicion)
    if simple and simple.group(1).strip():
        return simple.group(1).strip()
    return objeto.rsplit("/", 1)[-1] or "archivo"


def _es_adjunto(disposicion: str) -> bool:
    return disposicion.strip().lower().startswith("attachment")


def evaluar(bucket: str, objeto: str, tamano: int, stat: Any, cabecera: bytes) -> Hallazgo | None:
    guardado = _normalizar(getattr(stat, "content_type", None))
    disposicion = _metadatos(stat).get("content-disposition", "")
    real = tipo_archivo.detectar_mime(cabecera, objeto)
    ext = tipo_archivo.extension(objeto)
    por_extension = tipo_archivo.mime_por_extension(ext) if ext else tipo_archivo.OCTET_STREAM
    conocido = real != tipo_archivo.OCTET_STREAM

    motivos: list[str] = []
    if tipo_archivo.es_activo(guardado):
        motivos.append("guardado_activo")
    if conocido and not tipo_archivo.mime_compatible(guardado or tipo_archivo.OCTET_STREAM, real):
        motivos.append("real_distinto")
    if (
        conocido
        and por_extension != tipo_archivo.OCTET_STREAM
        and not tipo_archivo.mime_compatible(por_extension, real)
    ):
        motivos.append("extension_distinta")
    if tipo_archivo.es_activo(real) and not _es_adjunto(disposicion):
        motivos.append("real_activo_inline")
    if not motivos:
        return None

    nuevo_tipo = real if conocido else tipo_archivo.OCTET_STREAM
    if tipo_archivo.es_inline_seguro(nuevo_tipo) or _es_adjunto(disposicion):
        nueva_disposicion = disposicion
    else:
        nueva_disposicion = build_content_disposition(
            _nombre_descarga(disposicion, objeto), "attachment"
        )
    return Hallazgo(
        bucket=bucket,
        objeto=objeto,
        tamano=tamano,
        guardado=guardado,
        real=real,
        por_extension=por_extension,
        disposicion=disposicion,
        motivos=motivos,
        nuevo_tipo=nuevo_tipo,
        nueva_disposicion=nueva_disposicion,
    )


def metadatos_corregidos(stat: Any, hallazgo: Hallazgo) -> dict[str, str]:
    metadata = {
        clave: valor
        for clave, valor in _metadatos(stat).items()
        if clave.startswith("x-amz-meta-") or clave in _CABECERAS_CONSERVADAS
    }
    metadata["Content-Type"] = hallazgo.nuevo_tipo
    if hallazgo.nueva_disposicion:
        metadata["Content-Disposition"] = hallazgo.nueva_disposicion
    return metadata


def _necesita_cambio(hallazgo: Hallazgo) -> bool:
    return (
        hallazgo.nuevo_tipo != hallazgo.guardado
        or hallazgo.nueva_disposicion != hallazgo.disposicion
    )


def barrer_bucket(cliente: ClienteBarrido, corregir: bool, resumen: Resumen) -> Iterator[Hallazgo]:
    bucket = cliente.bucket_name
    for entrada in cliente.list_objects(recursive=True):
        if entrada.get("is_dir") or str(entrada["name"]).endswith("/"):
            continue
        objeto = str(entrada["name"])
        tamano = int(entrada.get("size") or 0)
        resumen.revisados += 1
        try:
            stat = cliente.stat_object(objeto)
            cabecera = cliente.leer_cabecera(objeto, tipo_archivo.CABECERA_BYTES) if tamano else b""
            hallazgo = evaluar(bucket, objeto, tamano, stat, cabecera)
        except Exception as exc:
            resumen.errores += 1
            yield Hallazgo(
                bucket, objeto, tamano, "", "", "", "", ["error"], "", "", f"error: {exc}"
            )
            continue
        if hallazgo is None:
            continue
        resumen.hallazgos += 1
        if corregir:
            if not _necesita_cambio(hallazgo):
                hallazgo.accion = "sin_cambios"
            else:
                try:
                    cliente.reescribir_metadatos(objeto, metadatos_corregidos(stat, hallazgo))
                    hallazgo.accion = "corregido"
                    resumen.corregidos += 1
                except Exception as exc:
                    resumen.errores += 1
                    hallazgo.accion = f"error: {exc}"
        yield hallazgo


def buckets_a_barrer(db: Session, nombres: Iterable[str] | None = None) -> list[AcervoBucket]:
    query = db.query(AcervoBucket)
    pedidos = {n for n in (nombres or []) if n}
    if pedidos:
        query = query.filter(AcervoBucket.acervo_bucket.in_(pedidos))
    return [
        b
        for b in query.order_by(AcervoBucket.acervo_bucket).all()
        if b.acervo_bucket not in BUCKETS_EXCLUIDOS
    ]


def barrer(
    db: Session, corregir: bool = False, nombres: Iterable[str] | None = None
) -> tuple[list[Hallazgo], Resumen]:
    resumen = Resumen()
    hallazgos: list[Hallazgo] = []
    for bucket in buckets_a_barrer(db, nombres):
        resumen.buckets.append(bucket.acervo_bucket)
        try:
            cliente = AcervoClient.for_bucket(bucket)
            hallazgos.extend(barrer_bucket(cliente, corregir, resumen))
        except Exception as exc:
            resumen.errores += 1
            hallazgos.append(
                Hallazgo(
                    bucket.acervo_bucket, "", 0, "", "", "", "", ["error"], "", "", f"error: {exc}"
                )
            )
    return hallazgos, resumen
