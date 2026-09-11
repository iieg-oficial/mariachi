from __future__ import annotations

import json
from typing import List, Literal
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas._camel import CamelCaseInput

MAX_CONFIG_BYTES = 8192
MAX_ROWS_PER_BLOCK = 12
MAX_TEXT_BLOCKS = 3
MAX_LABEL_LEN = 80
MAX_FIELD_LEN = 120
MAX_SUFFIX_LEN = 12
MAX_HREF_LEN = 500

ALLOWED_HREF_SCHEMES = frozenset({'http', 'https', 'mailto', 'tel'})
_empty = list

BLOCK_KEYS = ('list', 'cards', 'text')


def _validate_href(value: str | None) -> str | None:
    if value is None:
        return None
    trimmed = value.strip()
    if not trimmed:
        return None
    if len(trimmed) > MAX_HREF_LEN:
        raise ValueError('href demasiado largo')
    if trimmed.startswith('/'):
        if trimmed.startswith('//'):
            raise ValueError('href no puede ser protocol-relative')
        return trimmed
    parsed = urlparse(trimmed)
    if parsed.scheme not in ALLOWED_HREF_SCHEMES:
        raise ValueError(f'esquema de href no permitido: {parsed.scheme or "(vacio)"}')
    return trimmed


def _sin_nulos(**valores: object) -> dict:
    return {k: v for k, v in valores.items() if v is not None}


class _Strict(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)


class InfoboxListRow(_Strict):
    field: str = Field(..., min_length=1, max_length=MAX_FIELD_LEN)
    label: str = Field(..., min_length=1, max_length=MAX_LABEL_LEN)
    href: str | None = Field(default=None)
    formato: Literal['anio'] | None = Field(default=None)

    _check_href = field_validator('href')(lambda cls, v: _validate_href(v))


class InfoboxCard(_Strict):
    field: str = Field(..., min_length=1, max_length=MAX_FIELD_LEN)
    label: str = Field(..., min_length=1, max_length=MAX_LABEL_LEN)
    suffix: str | None = Field(default=None, max_length=MAX_SUFFIX_LEN)
    decimals: int | None = Field(default=None, ge=0, le=4)


class InfoboxTextItem(_Strict):
    field: str = Field(..., min_length=1, max_length=MAX_FIELD_LEN)
    label: str | None = Field(default=None, max_length=MAX_LABEL_LEN)
    href: str | None = Field(default=None)
    formato: Literal['anio'] | None = Field(default=None)

    _check_href = field_validator('href')(lambda cls, v: _validate_href(v))


class InfoboxTextBlock(_Strict):
    id: str = Field(..., min_length=1, max_length=24, pattern=r'^[a-z0-9_-]+$')
    items: list[InfoboxTextItem] = Field(..., min_length=1, max_length=MAX_ROWS_PER_BLOCK)


class InfoboxPropuestaConfig(CamelCaseInput):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)

    header_field: str | None = Field(default=None, max_length=MAX_FIELD_LEN)
    list: List[InfoboxListRow] = Field(default_factory=_empty, max_length=MAX_ROWS_PER_BLOCK)
    cards: List[InfoboxCard] = Field(default_factory=_empty, max_length=MAX_ROWS_PER_BLOCK)
    text: List[InfoboxTextBlock] = Field(default_factory=_empty, max_length=MAX_TEXT_BLOCKS)
    block_order: List[str] = Field(default_factory=_empty, max_length=len(BLOCK_KEYS) + MAX_TEXT_BLOCKS)

    @field_validator('block_order')
    @classmethod
    def _validate_block_order(cls, v: List[str]) -> List[str]:
        for key in v:
            base = key.split(':', 1)[0]
            if base not in BLOCK_KEYS:
                raise ValueError(f'bloque no permitido en blockOrder: {key}')
        if len(set(v)) != len(v):
            raise ValueError('blockOrder tiene claves repetidas')
        return v

    @model_validator(mode='after')
    def _validate_shape(self):
        if not self.header_field and not self.list and not self.cards and not self.text:
            raise ValueError('la configuracion no muestra ningun dato')
        text_ids = [block.id for block in self.text]
        if len(set(text_ids)) != len(text_ids):
            raise ValueError('los bloques de texto tienen ids repetidos')
        for key in self.block_order:
            if key.startswith('text:') and key.split(':', 1)[1] not in text_ids:
                raise ValueError(f'blockOrder referencia un bloque de texto inexistente: {key}')
        if len(json.dumps(self.to_config()).encode('utf-8')) > MAX_CONFIG_BYTES:
            raise ValueError('la configuracion excede el tamaño maximo')
        return self

    def referenced_fields(self) -> set[str]:
        fields: set[str] = set()
        if self.header_field:
            fields.add(self.header_field)
        fields.update(row.field for row in self.list)
        fields.update(card.field for card in self.cards)
        for block in self.text:
            fields.update(item.field for item in block.items)
        return fields

    def to_config(self) -> dict:
        config: dict = {}
        if self.header_field:
            config['headerField'] = self.header_field
        if self.list:
            config['list'] = [
                _sin_nulos(field=row.field, label=row.label, href=row.href, formato=row.formato)
                for row in self.list
            ]
        if self.cards:
            config['cards'] = [
                {
                    k: v for k, v in (
                        ('field', card.field),
                        ('label', card.label),
                        ('suffix', card.suffix),
                        ('decimals', card.decimals),
                    ) if v is not None
                }
                for card in self.cards
            ]
        if self.text:
            config['text'] = [
                {
                    'id': block.id,
                    'items': [
                        _sin_nulos(
                            field=item.field, label=item.label, href=item.href, formato=item.formato
                        )
                        for item in block.items
                    ],
                }
                for block in self.text
            ]
        if self.block_order:
            config['blockOrder'] = list(self.block_order)
        return config


def validate_fields_exist(config: InfoboxPropuestaConfig, available: set[str]) -> None:
    if not available:
        return
    unknown = sorted(config.referenced_fields() - available)
    if unknown:
        raise ValueError(f'campos que no existen en la capa: {", ".join(unknown)}')
