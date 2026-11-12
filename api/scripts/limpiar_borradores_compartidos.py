import argparse
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from app.core import database
from app.core.database import SessionLocal
from app.core.time import utcnow
from app.models.borrador import TIPOS_COMPARTIDOS, Borrador
from app.services import publicaciones_capas as publicaciones
from app.services.borradores_compartidos import quitar_campos
from app.services.limpieza_borradores import campos_sin_cambio

ACTIVOS = ('en_progreso', 'pendiente_revision', 'rechazado')


def main(aplicar: bool) -> None:
    database._ensure_dataengine_engine()
    db = SessionLocal()
    dataengine_db = database.DataEngineSessionLocal()
    limpiados = borrados = 0
    try:
        borradores = (
            db.query(Borrador)
            .filter(Borrador.resource_type.in_(TIPOS_COMPARTIDOS), Borrador.estado.in_(ACTIVOS))
            .all()
        )
        for borrador in borradores:
            row = publicaciones.fila(dataengine_db, borrador.resource_type, borrador.resource_id)
            iguales = campos_sin_cambio(borrador.resource_type, borrador.data or {}, row)
            if not iguales:
                continue
            data, autores = quitar_campos(borrador.data, borrador.autores, iguales)
            restantes = [c for c in data if c != 'action']
            destino = 'se borra' if not restantes else f'quedan {len(restantes)}'
            print(
                f'{borrador.id} {borrador.resource_type}:{borrador.resource_id} '
                f'[{borrador.estado}] sin cambio: {", ".join(sorted(iguales))} → {destino}'
            )
            if not aplicar:
                continue
            if not restantes:
                db.delete(borrador)
                borrados += 1
                continue
            borrador.data = data
            borrador.autores = autores
            borrador.version = (borrador.version or 1) + 1
            borrador.actualizado_en = utcnow()
            limpiados += 1
        if aplicar:
            db.commit()
            print(f'Aplicado: {limpiados} limpiados, {borrados} borrados')
        else:
            print('Simulación: nada se escribió. Repite con --aplicar.')
    finally:
        db.close()
        dataengine_db.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--aplicar', action='store_true')
    main(parser.parse_args().aplicar)
