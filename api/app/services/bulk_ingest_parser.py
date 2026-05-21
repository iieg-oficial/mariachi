from __future__ import annotations

import csv
import io
from typing import Any, Iterator


TRUE_VALUES = {'1', 'true', 't', 'yes', 'sí', 'si', 'y', 'sÍ', 'verdadero'}
FALSE_VALUES = {'0', 'false', 'f', 'no', 'n', 'falso'}

TECHNICAL_FIELDS = {
    'layer_key',
    'workspace',
    'layer_name_db',
    'layer_name_usuario',
    'descripcion',
    'frecuencia',
    'fecha_ultima',
    'tipo_mapa',
    'tipo_mapa_enlace',
    'texto_leyenda',
    'tarjeta_punto_poligono',
    'link_final_capa',
    'downloadable',
    'fuentes_corto',
    'fuentes_largo',
    'fuentes_enlace',
    'metodologia_texto',
    'metodologia_archivo_enlace',
    'metadato_txt',
    'metadato_xlsx',
    'nombre_pie_numeralia',
    *(f'numeralia_0{i}_{kind}' for i in range(1, 9) for kind in ('nombre', 'valor', 'simbolo')),
}

MAPALAB_EXCEL_PRESET = {
    'Tema': '',
    'Subtema': '',
    'Link final de la capa': 'link_final_capa',
    'Capa Descargable': 'downloadable',
    'Capa finalizada en Geoserver': '',
    'Nombre de la capa en BD': 'layer_name_db',
    'Nombre de la capa en GeoServer': 'layer_key',
    'Nombre de la capa para el usuario': 'layer_name_usuario',
    'Columna en tabla a categorizar en mapa': '',
    'Descripción (número de caracteres recomendado 255-300)': 'descripcion',
    'Frecuencia de actualización': 'frecuencia',
    'Fecha de última actualización IIEG': 'fecha_ultima',
    'Numeralia 01 - Nombre': 'numeralia_01_nombre',
    'Numeralia 01 - Valor': 'numeralia_01_valor',
    'Numeralia 01 - Simbolo': 'numeralia_01_simbolo',
    'Numeralia 02 - Nombre': 'numeralia_02_nombre',
    'Numeralia 02 - Valor': 'numeralia_02_valor',
    'Numeralia 02 - Simbolo': 'numeralia_02_simbolo',
    'Numeralia 03 - Nombre': 'numeralia_03_nombre',
    'Numeralia 03 - Valor': 'numeralia_03_valor',
    'Numeralia 03 - Simbolo': 'numeralia_03_simbolo',
    'Numeralia 04 - Nombre': 'numeralia_04_nombre',
    'Numeralia 04 - Valor': 'numeralia_04_valor',
    'Numeralia 04 - Simbolo': 'numeralia_04_simbolo',
    'Numeralia 05 - Nombre': 'numeralia_05_nombre',
    'Numeralia 05 - Valor': 'numeralia_05_valor',
    'Numeralia 05 - Simbolo': 'numeralia_05_simbolo',
    'Numeralia 06 - Nombre': 'numeralia_06_nombre',
    'Numeralia 06 - Valor': 'numeralia_06_valor',
    'Numeralia 06 - Simbolo': 'numeralia_06_simbolo',
    'Numeralia 07 - Nombre': 'numeralia_07_nombre',
    'Numeralia 07 - Valor': 'numeralia_07_valor',
    'Numeralia 07 - Simbolo': 'numeralia_07_simbolo',
    'Numeralia 08 - Nombre': 'numeralia_08_nombre',
    'Numeralia 08 - Valor': 'numeralia_08_valor',
    'Numeralia 08 - Simbolo': 'numeralia_08_simbolo',
    'Nota al pie de numeralia (rango de fechas que comprende)': 'nombre_pie_numeralia',
    'Rangos de periodicidad (anual, mensual, a partir de que año-mes) BOTONES': '',
    'Metodología texto corto/ fórmula (número de caracteres)': 'metodologia_texto',
    'Metodología archivo/enlace': 'metodologia_archivo_enlace',
    'Fuentes (texto largo)': 'fuentes_largo',
    'Fuente (Texto corto Descargable PDF)': 'fuentes_corto',
    'Fuentes (enlace)': 'fuentes_enlace',
    'Tipo de mapa (IIEG/INEGI)': 'tipo_mapa',
    'Texto Leyenda Jurídico': 'texto_leyenda',
    'Tipo de mapa (enlace)': 'tipo_mapa_enlace',
    'Metadato .txt': 'metadato_txt',
    'Metadato .xlsx': 'metadato_xlsx',
    'Tarjeta de Geometría': 'tarjeta_punto_poligono',
    'Estatus': '',
    'Publicado Geoserver': '',
    'Publicado Mapalab': '',
}


class BulkIngestParseError(ValueError):
    pass


def clean(value: Any) -> str | None:
    if value is None:
        return None
    s = str(value).strip()
    if not s or s.lower() in ('nan', 'none', 'null'):
        return None
    return s


def parse_bool(value: Any) -> bool | None:
    if value is None or value == '':
        return None
    s = str(value).strip().lower()
    if s in TRUE_VALUES:
        return True
    if s in FALSE_VALUES:
        return False
    return None


def _build_fuentes(row: dict) -> dict | None:
    corto = clean(row.get('fuentes_corto'))
    largo = clean(row.get('fuentes_largo'))
    enlace = clean(row.get('fuentes_enlace'))
    if not any([corto, largo, enlace]):
        return None
    result: dict[str, str] = {}
    if corto:
        result['corto'] = corto
    if largo:
        result['largo'] = largo
    if enlace:
        result['enlace'] = enlace
    return result


def _build_metodologia(row: dict) -> dict | None:
    texto = clean(row.get('metodologia_texto'))
    enlace = clean(row.get('metodologia_archivo_enlace'))
    if not any([texto, enlace]):
        return None
    result: dict[str, str] = {}
    if texto:
        result['texto'] = texto
    if enlace:
        result['archivo_enlace'] = enlace
    return result


def _build_metadato(row: dict) -> list[dict] | None:
    items: list[dict] = []
    txt = clean(row.get('metadato_txt'))
    xlsx = clean(row.get('metadato_xlsx'))
    if txt:
        items.append({'nombre': 'Metadato TXT', 'enlace': txt})
    if xlsx:
        items.append({'nombre': 'Metadato XLSX', 'enlace': xlsx})
    return items or None


def _build_numeralia(row: dict) -> list[dict]:
    values: list[dict] = []
    for i in range(1, 9):
        valor = clean(row.get(f'numeralia_0{i}_valor'))
        nombre = clean(row.get(f'numeralia_0{i}_nombre'))
        simbolo = clean(row.get(f'numeralia_0{i}_simbolo'))
        if valor or nombre:
            values.append({
                'posicion': i,
                'valor': valor,
                'nombre': nombre,
                'simbolo': simbolo,
            })
    return values


def _read_csv(content: bytes) -> tuple[list[str], list[dict]]:
    try:
        text = content.decode('utf-8-sig')
    except UnicodeDecodeError:
        text = content.decode('latin-1')
    reader = csv.DictReader(io.StringIO(text))
    headers = [h.strip() for h in (reader.fieldnames or [])]
    rows = [{(k or '').strip(): (v or '') for k, v in row.items()} for row in reader]
    return headers, rows


def _read_xlsx(content: bytes) -> tuple[list[str], list[dict]]:
    try:
        from openpyxl import load_workbook
    except ImportError as exc:
        raise BulkIngestParseError(
            'openpyxl no instalado. Agregar al pyproject.toml.'
        ) from exc

    wb = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    ws = wb.active
    rows_iter: Iterator[tuple] = ws.iter_rows(values_only=True)
    try:
        header_row = next(rows_iter)
    except StopIteration:
        return [], []
    headers = [str(h).strip() if h is not None else '' for h in header_row]
    rows: list[dict] = []
    for raw in rows_iter:
        if all(v is None or (isinstance(v, str) and not v.strip()) for v in raw):
            continue
        row: dict[str, str] = {}
        for i, value in enumerate(raw):
            if i >= len(headers) or not headers[i]:
                continue
            row[headers[i]] = '' if value is None else str(value).strip()
        rows.append(row)
    wb.close()
    return [h for h in headers if h], rows


def parse_source(filename: str, content: bytes) -> tuple[list[str], list[dict]]:
    lower = (filename or '').lower()
    if lower.endswith('.csv'):
        return _read_csv(content)
    if lower.endswith('.xlsx'):
        return _read_xlsx(content)
    raise BulkIngestParseError(
        f"Formato no soportado: '{filename}'. Sube CSV o XLSX."
    )


def apply_mapping(
    headers: list[str], rows: list[dict], mapping: dict[str, str]
) -> list[dict]:
    active = {src: dst for src, dst in mapping.items() if dst and src in headers}
    normalized: list[dict] = []
    for raw in rows:
        mapped: dict[str, Any] = {}
        for src, dst in active.items():
            mapped[dst] = raw.get(src, '')

        row_out: dict[str, Any] = {}
        for field, value in mapped.items():
            if field == 'downloadable':
                parsed = parse_bool(value)
                if parsed is not None:
                    row_out[field] = parsed
            elif field.startswith('numeralia_') or field == 'nombre_pie_numeralia' or field.startswith('fuentes_') or field.startswith('metodologia_') or field.startswith('metadato_'):
                row_out[field] = clean(value)
            else:
                row_out[field] = clean(value)

        fuentes = _build_fuentes(row_out)
        metodologia = _build_metodologia(row_out)
        metadato = _build_metadato(row_out)
        numeralia = _build_numeralia(row_out)
        pie = row_out.get('nombre_pie_numeralia')

        out: dict[str, Any] = {}
        for k in (
            'layer_key',
            'workspace',
            'layer_name_db',
            'layer_name_usuario',
            'descripcion',
            'frecuencia',
            'fecha_ultima',
            'tipo_mapa',
            'tipo_mapa_enlace',
            'texto_leyenda',
            'tarjeta_punto_poligono',
            'link_final_capa',
        ):
            v = row_out.get(k)
            if v is not None:
                out[k] = v
        if 'downloadable' in row_out:
            out['downloadable'] = row_out['downloadable']
        if fuentes:
            out['fuentes'] = fuentes
        if metodologia:
            out['metodologia'] = metodologia
        if metadato:
            out['metadato'] = metadato
        if numeralia:
            out['values'] = numeralia
        if pie:
            out['pie_numeralia'] = pie

        key = out.get('layer_key')
        if key and not out.get('workspace') and ':' in key:
            out['workspace'] = key.split(':', 1)[0]

        normalized.append(out)
    return normalized


def unknown_targets(mapping: dict[str, str]) -> list[str]:
    return [
        dst for dst in mapping.values()
        if dst and dst not in TECHNICAL_FIELDS
    ]
