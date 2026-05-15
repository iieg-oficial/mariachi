#!/usr/bin/env python3
"""Sincroniza static_version en platforms_config.py con las VERSIONs reales.

Lee la version actual de cada repo hermano del ecosistema IIEG y actualiza
el archivo `api/app/core/platforms_config.py` cuando detecta drift.

Uso:
    python3 scripts/sync-platforms-config.py            # dry-run, reporta drift
    python3 scripts/sync-platforms-config.py --apply    # aplica los cambios

Asume layout estandar `/IIEG/<repo>/` con `VERSION` en raiz. Si una version no se
puede determinar, se reporta y la entrada queda sin tocar.
"""
from __future__ import annotations

import argparse
import ast
import re
import sys
from pathlib import Path

IIEG_ROOT = Path(__file__).resolve().parent.parent.parent
PLATFORMS_CONFIG = Path(__file__).resolve().parent.parent / 'api' / 'app' / 'core' / 'platforms_config.py'


def read_version(repo: str) -> str | None:
    path = IIEG_ROOT / repo / 'VERSION'
    if not path.is_file():
        return None
    return path.read_text().strip().splitlines()[0].strip()


def parse_current_versions(content: str) -> dict[str, str]:
    tree = ast.parse(content)
    versions: dict[str, str] = {}
    for node in ast.walk(tree):
        if not isinstance(node, ast.Dict):
            continue
        entry: dict[str, str] = {}
        for key, value in zip(node.keys, node.values):
            if isinstance(key, ast.Constant) and isinstance(value, ast.Constant):
                entry[str(key.value)] = '' if value.value is None else str(value.value)
        if 'slug' in entry and 'static_version' in entry:
            versions[entry['slug']] = entry['static_version']
    return versions


def replace_version(content: str, slug: str, new_version: str) -> str:
    pattern = re.compile(
        r'("slug":\s*"' + re.escape(slug) + r'"[\s\S]*?"static_version":\s*")[^"]+(")',
    )
    return pattern.sub(rf'\g<1>{new_version}\g<2>', content, count=1)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true', help='Aplica los cambios al archivo.')
    args = parser.parse_args()

    if not PLATFORMS_CONFIG.is_file():
        print(f'ERROR: no se encuentra {PLATFORMS_CONFIG}', file=sys.stderr)
        return 1

    content = PLATFORMS_CONFIG.read_text()
    current = parse_current_versions(content)

    drift: list[tuple[str, str, str]] = []
    skipped: list[tuple[str, str]] = []

    for slug, current_version in current.items():
        actual = read_version(slug)
        if actual is None:
            skipped.append((slug, current_version))
            continue
        if actual != current_version:
            drift.append((slug, current_version, actual))

    if not drift:
        print('OK - platforms_config.py esta alineado con las VERSIONs actuales.')
        if skipped:
            print('\nSin determinar (revisar manualmente):')
            for slug, v in skipped:
                print(f'  {slug}: {v}')
        return 0

    print('Drift detectado:')
    for slug, old, new in drift:
        print(f'  {slug}: {old} -> {new}')
    if skipped:
        print('\nSin determinar (no hay VERSION en el repo, revisar manualmente):')
        for slug, v in skipped:
            print(f'  {slug}: {v}')

    if not args.apply:
        print('\nDry-run. Re-ejecuta con --apply para aplicar.')
        return 1

    new_content = content
    for slug, _, new in drift:
        new_content = replace_version(new_content, slug, new)
    PLATFORMS_CONFIG.write_text(new_content)
    print(f'\nAplicado en {PLATFORMS_CONFIG}.')
    print('Recordatorio: bump de mariachi + entry en docs/CHANGELOG.md.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
