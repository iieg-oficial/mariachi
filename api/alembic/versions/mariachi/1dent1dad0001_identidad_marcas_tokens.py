"""identidad: marcas, tokens, campos y fuentes

Revision ID: 1dent1dad0001
Revises: e4f5a6b7c8d9
Create Date: 2026-07-28 13:30:00.000000

"""
import json

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '1dent1dad0001'
down_revision = 'e4f5a6b7c8d9'
branch_labels = None
depends_on = None

SCHEMA = 'identidad'

SEMILLA = {
    "iieg": {
        "nombre": "IIEG",
        "descripcion": "Instituto de Informacion Estadistica y Geografica de Jalisco",
        "tokens": [
            ("espaciado", "space.0", "dimension", "0rem", ""),
            ("espaciado", "space.1", "dimension", "0.25rem", ""),
            ("espaciado", "space.2", "dimension", "0.5rem", ""),
            ("espaciado", "space.3", "dimension", "0.75rem", ""),
            ("espaciado", "space.4", "dimension", "1rem", ""),
            ("espaciado", "space.6", "dimension", "1.5rem", ""),
            ("espaciado", "space.8", "dimension", "2rem", ""),
            ("espaciado", "space.12", "dimension", "3rem", ""),
            ("espaciado", "space.16", "dimension", "4rem", ""),
            ("radio", "radius.sm", "dimension", "0.25rem", ""),
            ("radio", "radius.md", "dimension", "0.5rem", ""),
            ("radio", "radius.lg", "dimension", "1rem", ""),
            ("radio", "radius.full", "dimension", "9999px", ""),
            ("tipografia", "font.family.sans", "fontFamily", ["Garet", "system-ui", "sans-serif"], "Familia principal del IIEG (Garet, servida desde el acervo) — títulos y cuerpo"),
            ("tipografia", "font.size.xs", "dimension", "0.75rem", ""),
            ("tipografia", "font.size.sm", "dimension", "0.875rem", ""),
            ("tipografia", "font.size.base", "dimension", "1rem", ""),
            ("tipografia", "font.size.lg", "dimension", "1.125rem", ""),
            ("tipografia", "font.size.xl", "dimension", "1.25rem", ""),
            ("tipografia", "font.size.2xl", "dimension", "1.5rem", ""),
            ("tipografia", "font.size.3xl", "dimension", "1.875rem", ""),
            ("tipografia", "font.size.4xl", "dimension", "2.25rem", ""),
            ("tipografia", "font.weight.regular", "fontWeight", 400, ""),
            ("tipografia", "font.weight.medium", "fontWeight", 500, ""),
            ("tipografia", "font.weight.semibold", "fontWeight", 600, ""),
            ("tipografia", "font.weight.bold", "fontWeight", 700, ""),
            ("tipografia", "leading.tight", "number", 1.25, "Interlínea para títulos"),
            ("tipografia", "leading.snug", "number", 1.375, ""),
            ("tipografia", "leading.normal", "number", 1.5, "Interlínea para cuerpo de texto"),
            ("tipografia", "leading.relaxed", "number", 1.625, ""),
        ],
        "campos": [
            ("logo.largo.claro", "https://iieg.jalisco.gob.mx/acervo/iieg/logos/iieg_large.svg"),
            ("logo.largo.oscuro", "https://iieg.jalisco.gob.mx/acervo/iieg/logos/iieg_large_dark.svg"),
            ("logo.corto.claro", "https://iieg.jalisco.gob.mx/acervo/iieg/logos/iieg_short.svg"),
            ("logo.clearspace.factor", "1"),
            ("type.titles.font", "Garet"),
            ("type.titles.weights", "Heavy 800, Black 900"),
            ("type.body.font", "Garet"),
            ("type.body.weights", "Book 400, Medium 500, Bold 700"),
        ],
        "fuentes": [
            ("Garet", "opentype", "https://iieg.jalisco.gob.mx/acervo/iieg/tipografia/", [{"file": "garet-thin.otf", "weight": 100}, {"file": "garet-light.otf", "weight": 300}, {"file": "garet-book.otf", "weight": 400}, {"file": "garet-medium.otf", "weight": 500}, {"file": "garet-bold.otf", "weight": 700}, {"file": "garet-heavy.otf", "weight": 800}, {"file": "garet-black.otf", "weight": 900}]),
        ],
    },
    "jalisco": {
        "nombre": "Gobierno de Jalisco",
        "descripcion": "Gobierno del Estado de Jalisco",
        "tokens": [
            ("color", "color.primary", "color", "#465055", "Gris frío institucional (Pantone 431 C) — base sobria, texto y botones"),
            ("color", "color.secondary", "color", "#FF8300", "Naranja institucional (Pantone 151 C) — color distintivo de Jalisco"),
            ("color", "color.accent", "color", "#FF8300", "Naranja institucional (Pantone 151 C) — llamadas a la acción / resaltados"),
            ("color", "color.text", "color", "#465055", "Texto principal (gris frío)"),
            ("color", "color.bg", "color", "#FFFFFF", "Fondo de página (blanco)"),
            ("espaciado", "space.0", "dimension", "0rem", ""),
            ("espaciado", "space.1", "dimension", "0.25rem", ""),
            ("espaciado", "space.2", "dimension", "0.5rem", ""),
            ("espaciado", "space.3", "dimension", "0.75rem", ""),
            ("espaciado", "space.4", "dimension", "1rem", ""),
            ("espaciado", "space.6", "dimension", "1.5rem", ""),
            ("espaciado", "space.8", "dimension", "2rem", ""),
            ("espaciado", "space.12", "dimension", "3rem", ""),
            ("espaciado", "space.16", "dimension", "4rem", ""),
            ("radio", "radius.sm", "dimension", "0.25rem", ""),
            ("radio", "radius.md", "dimension", "0.5rem", ""),
            ("radio", "radius.lg", "dimension", "1rem", ""),
            ("radio", "radius.full", "dimension", "9999px", ""),
            ("tipografia", "font.family.sans", "fontFamily", ["Nexa", "system-ui", "sans-serif"], "Familia institucional de Jalisco (Nexa, palo seco) — títulos y cuerpo"),
            ("tipografia", "font.size.xs", "dimension", "0.75rem", ""),
            ("tipografia", "font.size.sm", "dimension", "0.875rem", ""),
            ("tipografia", "font.size.base", "dimension", "1rem", ""),
            ("tipografia", "font.size.lg", "dimension", "1.125rem", ""),
            ("tipografia", "font.size.xl", "dimension", "1.25rem", ""),
            ("tipografia", "font.size.2xl", "dimension", "1.5rem", ""),
            ("tipografia", "font.size.3xl", "dimension", "1.875rem", ""),
            ("tipografia", "font.size.4xl", "dimension", "2.25rem", ""),
            ("tipografia", "font.weight.regular", "fontWeight", 400, ""),
            ("tipografia", "font.weight.medium", "fontWeight", 500, ""),
            ("tipografia", "font.weight.semibold", "fontWeight", 600, ""),
            ("tipografia", "font.weight.bold", "fontWeight", 700, ""),
            ("tipografia", "leading.tight", "number", 1.25, "Interlínea para títulos"),
            ("tipografia", "leading.snug", "number", 1.375, ""),
            ("tipografia", "leading.normal", "number", 1.5, "Interlínea para cuerpo de texto"),
            ("tipografia", "leading.relaxed", "number", 1.625, ""),
        ],
        "campos": [
            ("brand.personality", "Institucional, cercano, dinámico, amable y confiable."),
            ("brand.transmit", "Cercanía, confianza, modernidad y utilidad."),
            ("brand.avoid", "Colores fuera de la paleta (rosa, vino, dorado, verde neón) y multicolor sobre el emblema; deformar, rotar o alterar la marca."),
            ("logo.clearspace.factor", "2"),
            ("logo.clearspace", "el ancho del isotipo"),
            ("logo.minsize.print", "2.5cm"),
            ("color.accent.max", "1"),
            ("type.titles.font", "Nexa"),
            ("type.titles.weights", "Bold, Heavy"),
            ("type.body.font", "Nexa"),
            ("type.body.weights", "Regular, Bold"),
            ("copy.tone", "Formal institucional, claro, cercano y directo"),
        ],
        "fuentes": [
            ("Nexa", "opentype", "https://iieg.jalisco.gob.mx/acervo/jalisco/tipografia/", []),
        ],
    },
}


def upgrade() -> None:
    op.execute(f'CREATE SCHEMA IF NOT EXISTS {SCHEMA}')

    op.create_table(
        'marcas',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('codigo', sa.String(length=50), nullable=False),
        sa.Column('nombre', sa.String(length=200), nullable=False),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('activa', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        schema=SCHEMA,
    )
    op.create_index('ix_identidad_marcas_codigo', 'marcas', ['codigo'], unique=True, schema=SCHEMA)

    op.create_table(
        'tokens',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('marca_id', sa.Integer(), nullable=False),
        sa.Column('grupo', sa.String(length=30), nullable=False),
        sa.Column('clave', sa.String(length=100), nullable=False),
        sa.Column('tipo', sa.String(length=30), nullable=False),
        sa.Column('valor', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('orden', sa.Integer(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['marca_id'], [f'{SCHEMA}.marcas.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('marca_id', 'grupo', 'clave', name='uq_identidad_token'),
        schema=SCHEMA,
    )
    op.create_index('ix_identidad_tokens_marca_id', 'tokens', ['marca_id'], schema=SCHEMA)
    op.create_index('ix_identidad_tokens_grupo', 'tokens', ['grupo'], schema=SCHEMA)

    op.create_table(
        'campos',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('marca_id', sa.Integer(), nullable=False),
        sa.Column('clave', sa.String(length=100), nullable=False),
        sa.Column('valor', sa.Text(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['marca_id'], [f'{SCHEMA}.marcas.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('marca_id', 'clave', name='uq_identidad_campo'),
        schema=SCHEMA,
    )
    op.create_index('ix_identidad_campos_marca_id', 'campos', ['marca_id'], schema=SCHEMA)

    op.create_table(
        'fuentes',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('marca_id', sa.Integer(), nullable=False),
        sa.Column('familia', sa.String(length=100), nullable=False),
        sa.Column('formato', sa.String(length=30), nullable=False),
        sa.Column('base_url', sa.Text(), nullable=True),
        sa.Column(
            'faces',
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column('orden', sa.Integer(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['marca_id'], [f'{SCHEMA}.marcas.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('marca_id', 'familia', name='uq_identidad_fuente'),
        schema=SCHEMA,
    )
    op.create_index('ix_identidad_fuentes_marca_id', 'fuentes', ['marca_id'], schema=SCHEMA)

    conn = op.get_bind()
    for codigo, datos in SEMILLA.items():
        marca_id = conn.execute(
            sa.text(
                f'INSERT INTO {SCHEMA}.marcas (codigo, nombre, descripcion) '
                'VALUES (:codigo, :nombre, :descripcion) RETURNING id'
            ),
            {'codigo': codigo, 'nombre': datos['nombre'], 'descripcion': datos['descripcion']},
        ).scalar()

        for orden, (grupo, clave, tipo, valor, descripcion) in enumerate(datos['tokens']):
            conn.execute(
                sa.text(
                    f'INSERT INTO {SCHEMA}.tokens '
                    '(marca_id, grupo, clave, tipo, valor, descripcion, orden) '
                    'VALUES (:marca_id, :grupo, :clave, :tipo, CAST(:valor AS jsonb), :descripcion, :orden)'
                ),
                {
                    'marca_id': marca_id,
                    'grupo': grupo,
                    'clave': clave,
                    'tipo': tipo,
                    'valor': json.dumps(valor),
                    'descripcion': descripcion or None,
                    'orden': orden,
                },
            )

        for clave, valor in datos['campos']:
            conn.execute(
                sa.text(
                    f'INSERT INTO {SCHEMA}.campos (marca_id, clave, valor) '
                    'VALUES (:marca_id, :clave, :valor)'
                ),
                {'marca_id': marca_id, 'clave': clave, 'valor': valor},
            )

        for orden, (familia, formato, base_url, faces) in enumerate(datos['fuentes']):
            conn.execute(
                sa.text(
                    f'INSERT INTO {SCHEMA}.fuentes '
                    '(marca_id, familia, formato, base_url, faces, orden) '
                    'VALUES (:marca_id, :familia, :formato, :base_url, CAST(:faces AS jsonb), :orden)'
                ),
                {
                    'marca_id': marca_id,
                    'familia': familia,
                    'formato': formato,
                    'base_url': base_url,
                    'faces': json.dumps(faces),
                    'orden': orden,
                },
            )


def downgrade() -> None:
    op.drop_table('fuentes', schema=SCHEMA)
    op.drop_table('campos', schema=SCHEMA)
    op.drop_table('tokens', schema=SCHEMA)
    op.drop_table('marcas', schema=SCHEMA)
    op.execute(f'DROP SCHEMA IF EXISTS {SCHEMA}')
