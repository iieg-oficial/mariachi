import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert

from app.core.database import _ensure_dataengine_engine
import app.core.database as database
from sqlalchemy.orm import Session


TRUE_VALUES = {'1', 'true', 't', 'yes', 'sí', 'si', 'y'}
FALSE_VALUES = {'0', 'false', 'f', 'no', 'n'}


def parse_bool(value) -> bool:
    if value is None:
        return True
    s = str(value).strip().lower()
    if s in TRUE_VALUES:
        return True
    if s in FALSE_VALUES:
        return False
    return True


def clean(value):
    if value is None:
        return None
    s = str(value).strip()
    if not s or s.lower() in ('nan', 'none', 'null'):
        return None
    return s


def build_fuentes(row: dict) -> dict | None:
    corto = clean(row.get('fuentes_texto_corto'))
    largo = clean(row.get('fuentes_texto_largo'))
    enlace = clean(row.get('fuentes_enlace'))
    if not any([corto, largo, enlace]):
        return None
    result = {}
    if corto:
        result['corto'] = corto
    if largo:
        result['largo'] = largo
    if enlace:
        result['enlace'] = enlace
    return result


def build_metodologia(row: dict) -> dict | None:
    texto = clean(row.get('metodologia_texto'))
    enlace = clean(row.get('metodologia_archivo_enlace'))
    if not any([texto, enlace]):
        return None
    result = {}
    if texto:
        result['texto'] = texto
    if enlace:
        result['archivo_enlace'] = enlace
    return result


def build_metadato(row: dict) -> list[dict] | None:
    items = []
    txt = clean(row.get('metadato_txt'))
    xlsx = clean(row.get('metadato_xlsx'))
    if txt:
        items.append({'nombre': 'Metadato TXT', 'enlace': txt})
    if xlsx:
        items.append({'nombre': 'Metadato XLSX', 'enlace': xlsx})
    return items or None


def build_numeralia(row: dict) -> list[dict]:
    values = []
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


def migrate(session: Session, dry_run: bool) -> dict:
    rows = session.execute(text(
        "SELECT * FROM public.mapalab_card WHERE nombre_capa_geoserver IS NOT NULL "
        "AND nombre_capa_geoserver != ''"
    )).mappings().all()

    metadata_rows = []
    stats_rows = []
    seen_keys = set()

    for row in rows:
        layer_key = clean(row['nombre_capa_geoserver'])
        if not layer_key or layer_key in seen_keys:
            continue
        seen_keys.add(layer_key)

        workspace = layer_key.split(':', 1)[0] if ':' in layer_key else None
        layer_name = layer_key.split(':', 1)[1] if ':' in layer_key else layer_key

        metadata_rows.append({
            'layer_key': layer_key,
            'workspace': workspace,
            'layer_name_db': clean(row.get('nombre_capa_db')),
            'layer_name_usuario': clean(row.get('nombre_capa_usuario')),
            'descripcion': clean(row.get('descripcion')),
            'fuentes': build_fuentes(dict(row)),
            'metodologia': build_metodologia(dict(row)),
            'metadato': build_metadato(dict(row)),
            'frecuencia': clean(row.get('frecuencia_actualizacion')),
            'fecha_ultima': clean(row.get('fecha_ultima_actualizacion')),
            'tipo_mapa': clean(row.get('tipo_mapa')),
            'tipo_mapa_enlace': clean(row.get('tipo_mapa_enlace')),
            'texto_leyenda': clean(row.get('texto_leyenda_juridico')),
            'tarjeta_punto_poligono': clean(row.get('tarjeta_punto_poligono')),
            'link_final_capa': clean(row.get('link_final_capa')),
            'downloadable': parse_bool(row.get('capa_descargable')),
            'updated_by': 'migrate_mapalab_card',
        })

        numeralia = build_numeralia(dict(row))
        pie = clean(row.get('nombre_pie_numeralia'))
        if numeralia or pie:
            stats_rows.append({
                'layer_key': layer_key,
                'stats_config': [],
                'values': numeralia,
                'pie_numeralia': pie,
            })

    print(f'[migrate] filas fuente: {len(rows)}')
    print(f'[migrate] metadata a insertar: {len(metadata_rows)}')
    print(f'[migrate] stats a insertar: {len(stats_rows)}')

    if dry_run:
        print('[migrate] DRY-RUN — no escribe')
        return {'metadata': len(metadata_rows), 'stats': len(stats_rows)}

    metadata_table = text("""
        INSERT INTO mapalab.layer_metadata (
            layer_key, workspace, layer_name_db, layer_name_usuario, descripcion,
            fuentes, metodologia, metadato, frecuencia, fecha_ultima,
            tipo_mapa, tipo_mapa_enlace, texto_leyenda, tarjeta_punto_poligono,
            link_final_capa, downloadable, updated_by
        ) VALUES (
            :layer_key, :workspace, :layer_name_db, :layer_name_usuario, :descripcion,
            CAST(:fuentes AS jsonb), CAST(:metodologia AS jsonb), CAST(:metadato AS jsonb),
            :frecuencia, :fecha_ultima,
            :tipo_mapa, :tipo_mapa_enlace, :texto_leyenda, :tarjeta_punto_poligono,
            :link_final_capa, :downloadable, :updated_by
        )
        ON CONFLICT (layer_key) DO UPDATE SET
            workspace = EXCLUDED.workspace,
            layer_name_db = EXCLUDED.layer_name_db,
            layer_name_usuario = EXCLUDED.layer_name_usuario,
            descripcion = EXCLUDED.descripcion,
            fuentes = EXCLUDED.fuentes,
            metodologia = EXCLUDED.metodologia,
            metadato = EXCLUDED.metadato,
            frecuencia = EXCLUDED.frecuencia,
            fecha_ultima = EXCLUDED.fecha_ultima,
            tipo_mapa = EXCLUDED.tipo_mapa,
            tipo_mapa_enlace = EXCLUDED.tipo_mapa_enlace,
            texto_leyenda = EXCLUDED.texto_leyenda,
            tarjeta_punto_poligono = EXCLUDED.tarjeta_punto_poligono,
            link_final_capa = EXCLUDED.link_final_capa,
            downloadable = EXCLUDED.downloadable,
            updated_at = NOW(),
            updated_by = EXCLUDED.updated_by
    """)

    stats_table = text("""
        INSERT INTO mapalab.layer_stats (layer_key, stats_config, values, pie_numeralia)
        VALUES (:layer_key, CAST(:stats_config AS jsonb), CAST(:values AS jsonb), :pie_numeralia)
        ON CONFLICT (layer_key) DO UPDATE SET
            values = EXCLUDED.values,
            pie_numeralia = EXCLUDED.pie_numeralia
    """)

    import json

    for row in metadata_rows:
        payload = {**row}
        for k in ('fuentes', 'metodologia', 'metadato'):
            payload[k] = json.dumps(payload[k]) if payload[k] else None
        session.execute(metadata_table, payload)

    for row in stats_rows:
        payload = {
            'layer_key': row['layer_key'],
            'stats_config': json.dumps(row['stats_config']),
            'values': json.dumps(row['values']),
            'pie_numeralia': row['pie_numeralia'],
        }
        session.execute(stats_table, payload)

    session.commit()
    print(f'[migrate] OK — {len(metadata_rows)} metadata + {len(stats_rows)} stats')
    return {'metadata': len(metadata_rows), 'stats': len(stats_rows)}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--dry-run', action='store_true', default=True)
    args = parser.parse_args()

    _ensure_dataengine_engine()
    with Session(database.dataengine_engine) as session:
        migrate(session, dry_run=not args.apply)
    return 0


if __name__ == '__main__':
    sys.exit(main())
