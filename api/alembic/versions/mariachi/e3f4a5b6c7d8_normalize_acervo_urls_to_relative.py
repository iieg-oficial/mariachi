"""normalize acervo urls to relative

Reemplaza URLs absolutas del Acervo (`https://{ACERVO_PUBLIC_ENDPOINT}/{bucket}/{path}`)
por su forma relativa (`bucket/path`) en columnas de texto y dentro de JSON blobs.
Idempotente: filas que ya están en relativo o que apuntan a hosts externos no se tocan.

Revision ID: e3f4a5b6c7d8
Revises: d2e3f4a5b6c7
Create Date: 2026-04-27 22:00:00.000000

"""
import sqlalchemy as sa

from alembic import op

revision = 'e3f4a5b6c7d8'
down_revision = 'd2e3f4a5b6c7'
branch_labels = None
depends_on = None


URL_KEY_SUFFIXES = ('_url', 'Url')


def _is_url_key(key: str) -> bool:
    return any(key.endswith(s) for s in URL_KEY_SUFFIXES)


def _build_prefixes(public_endpoint: str) -> list[str]:
    return [
        f'https://{public_endpoint}/',
        f'http://{public_endpoint}/',
    ]


def _strip(value, prefixes):
    if not isinstance(value, str) or not value:
        return value
    for prefix in prefixes:
        if value.startswith(prefix):
            return value[len(prefix):].lstrip('/')
    return value


def _walk(obj, prefixes):
    if isinstance(obj, dict):
        return {
            k: (_strip(v, prefixes) if _is_url_key(k) and isinstance(v, str) else _walk(v, prefixes))
            for k, v in obj.items()
        }
    if isinstance(obj, list):
        return [_walk(item, prefixes) for item in obj]
    return obj


def upgrade() -> None:
    from app.core.settings import get_settings

    public_endpoint = get_settings().acervo_public_endpoint
    if not public_endpoint:
        return
    prefixes = _build_prefixes(public_endpoint)

    bind = op.get_bind()

    eventos_t = sa.table(
        'eventos',
        sa.column('id', sa.Integer),
        sa.column('icono_url', sa.Text),
        sa.column('imagen_url', sa.Text),
    )
    rows = bind.execute(sa.select(eventos_t.c.id, eventos_t.c.icono_url, eventos_t.c.imagen_url)).fetchall()
    for row in rows:
        new_icono = _strip(row.icono_url, prefixes)
        new_imagen = _strip(row.imagen_url, prefixes)
        if new_icono != row.icono_url or new_imagen != row.imagen_url:
            bind.execute(
                sa.update(eventos_t)
                .where(eventos_t.c.id == row.id)
                .values(icono_url=new_icono, imagen_url=new_imagen)
            )

    home_t = sa.table(
        'home_sections',
        sa.column('key', sa.String),
        sa.column('payload_published', sa.JSON),
        sa.column('payload_draft', sa.JSON),
    )
    rows = bind.execute(sa.select(home_t.c.key, home_t.c.payload_published, home_t.c.payload_draft)).fetchall()
    for row in rows:
        new_pub = _walk(row.payload_published, prefixes)
        new_draft = _walk(row.payload_draft, prefixes)
        if new_pub != row.payload_published or new_draft != row.payload_draft:
            bind.execute(
                sa.update(home_t)
                .where(home_t.c.key == row.key)
                .values(payload_published=new_pub, payload_draft=new_draft)
            )

    pages_t = sa.table(
        'pages',
        sa.column('id', sa.Integer),
        sa.column('sections', sa.JSON),
    )
    rows = bind.execute(sa.select(pages_t.c.id, pages_t.c.sections)).fetchall()
    for row in rows:
        new_sections = _walk(row.sections, prefixes)
        if new_sections != row.sections:
            bind.execute(
                sa.update(pages_t)
                .where(pages_t.c.id == row.id)
                .values(sections=new_sections)
            )


def downgrade() -> None:
    from app.core.settings import get_settings

    public_endpoint = get_settings().acervo_public_endpoint
    if not public_endpoint:
        return
    scheme = 'https' if get_settings().acervo_use_ssl else 'http'
    prefix_abs = f'{scheme}://{public_endpoint}/'

    def _expand(value):
        if not isinstance(value, str) or not value:
            return value
        if '://' in value:
            return value
        return f'{prefix_abs}{value.lstrip("/")}'

    def _walk_expand(obj):
        if isinstance(obj, dict):
            return {
                k: (_expand(v) if _is_url_key(k) and isinstance(v, str) else _walk_expand(v))
                for k, v in obj.items()
            }
        if isinstance(obj, list):
            return [_walk_expand(item) for item in obj]
        return obj

    bind = op.get_bind()

    eventos_t = sa.table(
        'eventos',
        sa.column('id', sa.Integer),
        sa.column('icono_url', sa.Text),
        sa.column('imagen_url', sa.Text),
    )
    rows = bind.execute(sa.select(eventos_t.c.id, eventos_t.c.icono_url, eventos_t.c.imagen_url)).fetchall()
    for row in rows:
        bind.execute(
            sa.update(eventos_t)
            .where(eventos_t.c.id == row.id)
            .values(icono_url=_expand(row.icono_url), imagen_url=_expand(row.imagen_url))
        )

    home_t = sa.table(
        'home_sections',
        sa.column('key', sa.String),
        sa.column('payload_published', sa.JSON),
        sa.column('payload_draft', sa.JSON),
    )
    rows = bind.execute(sa.select(home_t.c.key, home_t.c.payload_published, home_t.c.payload_draft)).fetchall()
    for row in rows:
        bind.execute(
            sa.update(home_t)
            .where(home_t.c.key == row.key)
            .values(
                payload_published=_walk_expand(row.payload_published),
                payload_draft=_walk_expand(row.payload_draft),
            )
        )

    pages_t = sa.table(
        'pages',
        sa.column('id', sa.Integer),
        sa.column('sections', sa.JSON),
    )
    rows = bind.execute(sa.select(pages_t.c.id, pages_t.c.sections)).fetchall()
    for row in rows:
        bind.execute(
            sa.update(pages_t)
            .where(pages_t.c.id == row.id)
            .values(sections=_walk_expand(row.sections))
        )


