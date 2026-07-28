from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text  # noqa: E402

from app.core.database import DataEngineSessionLocal, _ensure_dataengine_engine  # noqa: E402
from app.services.grid_batch import history_text, record_cell_history  # noqa: E402
from app.services.grids.layer_metadata_grid import SPEC  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            'Siembra el estado inicial del historial de metadatos de capas, '
            'atribuido al ultimo responsable conocido y marcado source=backfill.'
        ),
    )
    parser.add_argument('--dry-run', action='store_true', help='Solo reporta, no escribe')
    args = parser.parse_args()

    _ensure_dataengine_engine()
    session = DataEngineSessionLocal()
    try:
        conn = session.connection()
        existing = conn.execute(
            text(
                f'SELECT COUNT(*) FROM {SPEC.history_table} '
                "WHERE resource = :resource AND source = 'backfill'"
            ),
            {'resource': SPEC.key},
        ).scalar()
        if existing:
            print(f'Ya existen {existing} filas de backfill para {SPEC.key}. Nada que hacer.')
            return 0

        rows = SPEC.fetch_rows(conn)
        entries = []
        for row in rows:
            for key in SPEC.fields:
                value = row.get(key)
                if history_text(value) is None:
                    continue
                entries.append({
                    'row_key': row[SPEC.row_key_field],
                    'column': key,
                    'from_value': None,
                    'to_value': value,
                })

        print(f'Capas: {len(rows)} · celdas con valor: {len(entries)}')
        if args.dry_run:
            print('dry-run: no se escribio nada')
            return 0

        by_author: dict[str | None, list[dict]] = {}
        for row in rows:
            author = row.get('updated_by')
            keys = {row[SPEC.row_key_field]}
            by_author.setdefault(author, [])
            for entry in entries:
                if entry['row_key'] in keys:
                    by_author[author].append(entry)

        total = 0
        for author, author_entries in by_author.items():
            total += record_cell_history(conn, SPEC, author_entries, author, source='backfill')
        session.commit()
        print(f'Insertadas {total} filas de historial inicial.')
        return 0
    finally:
        session.close()


if __name__ == '__main__':
    raise SystemExit(main())
