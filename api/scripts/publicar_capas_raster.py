from __future__ import annotations

import argparse
import re
import sys
from collections import defaultdict
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session

from app.core import database
from app.models.layer import Layer, Workspace
from app.schemas.layer import LayerCreate
from app.services import layer_service
from app.services.mapalab_notifier import notify_tree_changed_now
from app.services.mosaic_client import MosaicClient

GEOSERVER_WORKSPACE = 'raster'
DATA_DIR = '/opt/geoserver/data_dir'
MINUSCULAS = {'de', 'del', 'la', 'las', 'el', 'los', 'y', 'e'}
ACTOR = 'script:publicar_capas_raster'


def normalizar(url: str) -> str:
    ruta = url.removeprefix('file:').removeprefix('//')
    ruta = ruta.removeprefix(f'{DATA_DIR}/').lstrip('/')
    return ruta.removeprefix('data/')


def slug(valor: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', valor.lower()).strip('-')


def etiqueta(capa: str) -> str:
    palabras = capa.replace('sin_anio', 'sin_año').split('_')
    salida = [
        p if (i > 0 and p in MINUSCULAS) or p == 'sin' or p == 'año' else p.capitalize()
        for i, p in enumerate(palabras)
    ]
    return ' '.join(salida)


def capas_por_carpeta(client: MosaicClient) -> dict[str, list[str]]:
    carpetas: dict[str, list[str]] = defaultdict(list)
    for store in client.list_coveragestores(GEOSERVER_WORKSPACE):
        ruta = normalizar(client.get_coveragestore(GEOSERVER_WORKSPACE, store).get('url') or '')
        carpeta = ruta.rsplit('/', 1)[0] if '/' in ruta else ''
        carpetas[carpeta].extend(client.list_coverages(GEOSERVER_WORKSPACE, store))
    return carpetas


def alias_del_workspace(db: Session) -> str:
    filas = db.query(Workspace).filter(Workspace.geoserver_workspace == GEOSERVER_WORKSPACE).all()
    if not filas:
        raise SystemExit(f'El workspace {GEOSERVER_WORKSPACE} no esta conectado al catalogo')
    preferido = next((w for w in filas if w.alias == GEOSERVER_WORKSPACE), filas[0])
    return preferido.alias


def asegurar_tema(db: Session, tema_id: str, tema: str, aplicar: bool) -> None:
    nodo = db.query(Layer).filter(Layer.id == tema_id).first()
    if nodo is None:
        print(f'+ tema {tema_id} «{tema}» (oculto)')
        if aplicar:
            layer_service.create_layer(
                db,
                LayerCreate(id=tema_id, label=tema, node_type='tema', hidden_in_menu=True),
                updated_by=ACTOR,
                skip_geoserver_validation=True,
            )
        return
    if nodo.node_type != 'tema' or nodo.parent_id is not None:
        raise SystemExit(f'El nodo {tema_id} ya existe y no es un tema raiz')
    if nodo.deleted_at is not None:
        raise SystemExit(f'El tema {tema_id} esta en la papelera: restauralo o usa otro id')
    print(f'= tema {tema_id} «{nodo.label}» ya existe')


def id_libre(db: Session, base: str, tomados: set[str]) -> str:
    candidato = base[:100]
    sufijo = 2
    while candidato in tomados or db.query(Layer.id).filter(Layer.id == candidato).first():
        cola = f'-{sufijo}'
        candidato = base[: 100 - len(cola)] + cola
        sufijo += 1
    tomados.add(candidato)
    return candidato


def main() -> int:
    parser = argparse.ArgumentParser(
        description='Da de alta en el arbol, ocultas bajo un tema oculto, las capas de raster '
        'publicadas desde una carpeta de GeoServer. Sin --aplicar solo muestra el plan.'
    )
    parser.add_argument('--carpetas', action='store_true', help='lista las carpetas con capas y sale')
    parser.add_argument('--carpeta', help='carpeta relativa al data dir, ej. geoserver-raster/ortofotos')
    parser.add_argument('--tema-id', help='id del tema, ej. ortofotos')
    parser.add_argument('--tema', help='nombre del tema, ej. Ortofotos')
    parser.add_argument('--aplicar', action='store_true')
    args = parser.parse_args()

    carpetas = capas_por_carpeta(MosaicClient())

    if args.carpetas:
        for carpeta in sorted(c for c in carpetas if c):
            print(f'{carpeta}\t{len(carpetas[carpeta])}')
        return 0

    if not (args.carpeta and args.tema_id and args.tema):
        parser.error('--carpeta, --tema-id y --tema son obligatorios')

    carpeta = args.carpeta.strip('/')
    capas = sorted(carpetas.get(carpeta, []))
    if not capas:
        raise SystemExit(f'No hay capas de {GEOSERVER_WORKSPACE} publicadas desde {carpeta}')
    tema_id = slug(args.tema_id)

    database._ensure_dataengine_engine()
    db = database.DataEngineSessionLocal()
    try:
        alias = alias_del_workspace(db)
        asegurar_tema(db, tema_id, args.tema, args.aplicar)

        existentes = {
            fila.geoserver_layer: fila
            for fila in db.query(Layer).filter(
                Layer.workspace_alias == alias,
                Layer.geoserver_layer.in_(capas),
                Layer.node_type == 'leaf',
            )
            if fila.deleted_at is None
        }
        borradas = {
            g for (g,) in db.query(Layer.geoserver_layer).filter(
                Layer.workspace_alias == alias,
                Layer.geoserver_layer.in_(capas),
                Layer.node_type == 'leaf',
                Layer.deleted_at.is_not(None),
            )
        } - existentes.keys()

        tomados: set[str] = set()
        nuevas = 0
        for orden, capa in enumerate(capas):
            if capa in existentes:
                fila = existentes[capa]
                print(f'= {capa}: ya esta en el arbol como {fila.id} «{fila.label}»')
                continue
            if capa in borradas:
                print(f'= {capa}: esta en la papelera; se restaura desde el admin, no se duplica')
                continue
            hoja_id = id_libre(db, f'{tema_id}-{slug(capa)}', tomados)
            print(f'+ {capa} → {hoja_id} «{etiqueta(capa)}» (oculta)')
            nuevas += 1
            if args.aplicar:
                layer_service.create_layer(
                    db,
                    LayerCreate(
                        id=hoja_id,
                        parent_id=tema_id,
                        label=etiqueta(capa),
                        sort_order=orden,
                        node_type='leaf',
                        hidden_in_menu=True,
                        workspace_alias=alias,
                        geoserver_layer=capa,
                        geometry_type='raster',
                        wfs_available=False,
                        downloadable=False,
                        queryable=False,
                    ),
                    updated_by=ACTOR,
                    skip_geoserver_validation=True,
                )

        print(f'\n{len(capas)} capas en {carpeta} · nuevas: {nuevas} · ya estaban: {len(capas) - nuevas}')
        if args.aplicar and nuevas:
            db.commit()
            notify_tree_changed_now()
            print('Guardado y arbol de mapalab refrescado.')
        else:
            db.rollback()
    finally:
        db.close()
    return 0


if __name__ == '__main__':
    sys.exit(main())
