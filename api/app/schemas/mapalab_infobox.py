from __future__ import annotations

import json
import re
from typing import Annotated, Any, List, Literal
from urllib.parse import urlparse

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

from app.schemas._camel import CamelCaseInput

MAX_CONFIG_BYTES = 8192
MAX_ROWS_PER_BLOCK = 12
MAX_TEXT_BLOCKS = 3
MAX_LABEL_LEN = 80
MAX_TEXT_LEN = 300
MAX_FIELD_LEN = 120
MAX_SUFFIX_LEN = 12
MAX_HREF_LEN = 500
MAX_COMPOSE_PARTS = 6
MAX_AFFIX_LEN = 16
MAX_SEP_LEN = 8

Afijo = Annotated[str, StringConstraints(strip_whitespace=False, max_length=MAX_AFFIX_LEN)]
Separador = Annotated[str, StringConstraints(strip_whitespace=False, max_length=MAX_SEP_LEN)]

ALLOWED_HREF_SCHEMES = frozenset({'http', 'https', 'mailto', 'tel'})
_empty = list

BLOCK_KEYS = ('list', 'cards', 'text')

_CONTACTO = re.compile(
    r'(https?://|www\.|\S+@\S+\.\S+'
    r'|\b[\w-]+\.(?:com|net|org|mx|io|info|xyz|site|online|me|ly|app|link|biz|co)\b'
    r'|(?:\+?\d[\s().-]*){10,})',
    re.IGNORECASE,
)


def texto_con_contacto(texto: str | None) -> bool:
    return bool(texto) and bool(_CONTACTO.search(texto))


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


def _coerce_parts(value: Any) -> Any:
    if isinstance(value, list):
        return [{'field': part} if isinstance(part, str) else part for part in value]
    return value


class _Strict(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)


class InfoboxComposePart(_Strict):
    field: str = Field(..., min_length=1, max_length=MAX_FIELD_LEN)
    prefix: Afijo | None = Field(default=None)
    suffix: Afijo | None = Field(default=None)

    def to_config(self) -> dict:
        pairs = (('field', self.field), ('prefix', self.prefix), ('suffix', self.suffix))
        return {k: v for k, v in pairs if v is not None}


class InfoboxComposeValue(_Strict):
    compose: List[InfoboxComposePart] = Field(..., min_length=1, max_length=MAX_COMPOSE_PARTS)
    sep: Separador | None = Field(default=None)

    _coerce_compose = field_validator('compose', mode='before')(lambda cls, v: _coerce_parts(v))

    def value_fields(self) -> set[str]:
        return {part.field for part in self.compose}

    def value_config(self) -> dict:
        config: dict = {'compose': [part.to_config() for part in self.compose]}
        if self.sep is not None:
            config['sep'] = self.sep
        return config


class _ValueDef(_Strict):
    field: str | None = Field(default=None, min_length=1, max_length=MAX_FIELD_LEN)
    compose: List[InfoboxComposePart] | None = Field(
        default=None, min_length=1, max_length=MAX_COMPOSE_PARTS
    )
    sep: Separador | None = Field(default=None)

    _coerce_compose = field_validator('compose', mode='before')(lambda cls, v: _coerce_parts(v))

    @model_validator(mode='after')
    def _validate_value_source(self):
        if bool(self.field) == bool(self.compose):
            raise ValueError('cada fila lleva un campo o una combinacion de campos, no ambos')
        if self.sep is not None and not self.compose:
            raise ValueError('sep solo aplica a una fila combinada')
        return self

    def value_fields(self) -> set[str]:
        if self.field:
            return {self.field}
        return {part.field for part in (self.compose or [])}

    def value_config(self) -> dict:
        if self.field:
            return {'field': self.field}
        config: dict = {'compose': [part.to_config() for part in (self.compose or [])]}
        if self.sep is not None:
            config['sep'] = self.sep
        return config


class InfoboxListRow(_ValueDef):
    label: str = Field(..., min_length=1, max_length=MAX_LABEL_LEN)
    href: str | None = Field(default=None)
    formato: Literal['anio'] | None = Field(default=None)
    raw: bool | None = Field(default=None)
    split: bool | None = Field(default=None)

    _check_href = field_validator('href')(lambda cls, v: _validate_href(v))

    def to_config(self) -> dict:
        config = self.value_config()
        config['label'] = self.label
        if self.href is not None:
            config['href'] = self.href
        if self.formato is not None:
            config['formato'] = self.formato
        if self.raw:
            config['raw'] = True
        if self.split:
            config['split'] = True
        return config


class InfoboxCard(_ValueDef):
    label: str = Field(..., min_length=1, max_length=MAX_LABEL_LEN)
    suffix: str | None = Field(default=None, max_length=MAX_SUFFIX_LEN)
    decimals: int | None = Field(default=None, ge=0, le=4)
    op: Literal['join', 'sum'] | None = Field(default=None)
    raw: bool | None = Field(default=None)

    @model_validator(mode='after')
    def _validate_op(self):
        if self.op is not None and not self.compose:
            raise ValueError('op solo aplica a una cifra combinada')
        if self.op == 'sum' and self.sep is not None:
            raise ValueError('una suma no lleva separador')
        return self

    def to_config(self) -> dict:
        config = self.value_config()
        config['label'] = self.label
        if self.op == 'sum':
            config['op'] = 'sum'
        if self.suffix is not None:
            config['suffix'] = self.suffix
        if self.decimals is not None:
            config['decimals'] = self.decimals
        if self.raw:
            config['raw'] = True
        return config


class InfoboxTextItem(_ValueDef):
    label: str | None = Field(default=None, max_length=MAX_TEXT_LEN)
    href: str | None = Field(default=None)
    formato: Literal['anio'] | None = Field(default=None)

    _check_href = field_validator('href')(lambda cls, v: _validate_href(v))

    @model_validator(mode='after')
    def _validate_value_source(self):
        if self.field and self.compose:
            raise ValueError('cada parrafo lleva un campo o una combinacion de campos, no ambos')
        if not self.field and not self.compose and not self.label:
            raise ValueError('un parrafo sin campo necesita texto')
        if self.sep is not None and not self.compose:
            raise ValueError('sep solo aplica a una fila combinada')
        return self

    def to_config(self) -> dict:
        config = self.value_config() if (self.field or self.compose) else {}
        if self.label is not None:
            config['label'] = self.label
        if self.href is not None:
            config['href'] = self.href
        if self.formato is not None:
            config['formato'] = self.formato
        return config


class InfoboxTextBlock(_Strict):
    id: str = Field(..., min_length=1, max_length=24, pattern=r'^[a-z0-9_-]+$')
    items: list[InfoboxTextItem] = Field(..., min_length=1, max_length=MAX_ROWS_PER_BLOCK)


class InfoboxPropuestaConfig(CamelCaseInput):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)

    header_field: str | InfoboxComposeValue | None = Field(default=None)
    list: List[InfoboxListRow] = Field(default_factory=_empty, max_length=MAX_ROWS_PER_BLOCK)
    cards: List[InfoboxCard] = Field(default_factory=_empty, max_length=MAX_ROWS_PER_BLOCK)
    text: List[InfoboxTextBlock] = Field(default_factory=_empty, max_length=MAX_TEXT_BLOCKS)
    block_order: List[str] = Field(default_factory=_empty, max_length=len(BLOCK_KEYS) + MAX_TEXT_BLOCKS)

    @field_validator('header_field')
    @classmethod
    def _validate_header_field(cls, v):
        if isinstance(v, str) and len(v) > MAX_FIELD_LEN:
            raise ValueError('headerField demasiado largo')
        return v

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
        if any(texto_con_contacto(texto) for texto in self.textos_libres()):
            raise ValueError('el texto no puede llevar links, correos ni telefonos')
        return self

    def textos_libres(self) -> list[str]:
        textos: list[str] = []

        def del_valor(valor: _ValueDef | InfoboxComposeValue) -> None:
            textos.extend(t for t in (getattr(valor, 'sep', None),) if t)
            for parte in valor.compose or []:
                textos.extend(t for t in (parte.prefix, parte.suffix) if t)

        if isinstance(self.header_field, str):
            textos.append(self.header_field)
        elif self.header_field is not None:
            del_valor(self.header_field)
        filas: list[_ValueDef] = [*self.list, *self.cards]
        filas.extend(item for bloque in self.text for item in bloque.items)
        for fila in filas:
            del_valor(fila)
            textos.extend(t for t in (getattr(fila, 'label', None), getattr(fila, 'suffix', None)) if t)
        return textos

    def referenced_fields(self) -> set[str]:
        fields: set[str] = set()
        if isinstance(self.header_field, str):
            fields.add(self.header_field)
        elif self.header_field is not None:
            fields |= self.header_field.value_fields()
        for row in self.list:
            fields |= row.value_fields()
        for card in self.cards:
            fields |= card.value_fields()
        for block in self.text:
            for item in block.items:
                fields |= item.value_fields()
        return fields

    def to_config(self) -> dict:
        config: dict = {}
        if self.header_field:
            config['headerField'] = (
                self.header_field
                if isinstance(self.header_field, str)
                else self.header_field.value_config()
            )
        if self.list:
            config['list'] = [row.to_config() for row in self.list]
        if self.cards:
            config['cards'] = [card.to_config() for card in self.cards]
        if self.text:
            config['text'] = [
                {'id': block.id, 'items': [item.to_config() for item in block.items]}
                for block in self.text
            ]
        if self.block_order:
            config['blockOrder'] = list(self.block_order)
        return config


def validate_fields_exist(config: InfoboxPropuestaConfig, available: set[str]) -> None:
    if not available:
        return
    faltantes = config.referenced_fields() - available
    if isinstance(config.header_field, str):
        faltantes.discard(config.header_field)
    unknown = sorted(faltantes)
    if unknown:
        raise ValueError(f'campos que no existen en la capa: {", ".join(unknown)}')
