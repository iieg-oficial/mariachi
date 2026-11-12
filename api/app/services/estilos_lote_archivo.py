from __future__ import annotations

import csv
import io
import zipfile
from datetime import date, datetime

import openpyxl

from app.services.estilos_lote_tabla import TablaInvalidaError

EXTENSIONES_EXCEL = ('.xlsx', '.xlsm')
EXTENSIONES_TEXTO = ('.csv', '.tsv', '.txt')


def _celda(valor: object) -> str:
    if valor is None:
        return ''
    if isinstance(valor, float) and valor.is_integer():
        return str(int(valor))
    if isinstance(valor, datetime | date):
        return valor.isoformat()
    return str(valor)


def _excel_a_csv(contenido: bytes) -> str:
    try:
        libro = openpyxl.load_workbook(io.BytesIO(contenido), read_only=True, data_only=True)
    except (zipfile.BadZipFile, OSError, KeyError, ValueError) as exc:
        raise TablaInvalidaError('No se pudo abrir el Excel') from exc
    try:
        salida = io.StringIO()
        escritor = csv.writer(salida, lineterminator='\n')
        for fila in libro.worksheets[0].iter_rows(values_only=True):
            celdas = [_celda(v) for v in fila]
            if any(celdas):
                escritor.writerow(celdas)
        return salida.getvalue()
    finally:
        libro.close()


def leer_archivo(nombre: str, contenido: bytes) -> str:
    nombre = (nombre or '').lower()
    if nombre.endswith(EXTENSIONES_EXCEL):
        return _excel_a_csv(contenido)
    if not nombre.endswith(EXTENSIONES_TEXTO):
        raise TablaInvalidaError('Sube un Excel (.xlsx) o un CSV')
    try:
        return contenido.decode('utf-8-sig')
    except UnicodeDecodeError:
        return contenido.decode('cp1252', errors='replace')
