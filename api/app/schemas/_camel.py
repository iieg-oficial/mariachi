from __future__ import annotations

import re

from pydantic import BaseModel, ConfigDict, model_validator

_CAMEL_RE = re.compile(r"(?<!^)(?=[A-Z])")


def _camel_to_snake(name: str) -> str:
    return _CAMEL_RE.sub("_", name).lower()


def _normalize_for_cls(cls, data: dict) -> dict:
    field_names = set(getattr(cls, "model_fields", {}).keys())
    out: dict = {}
    for key, value in data.items():
        if (
            isinstance(key, str)
            and key not in field_names
            and "_" not in key
            and any(c.isupper() for c in key)
        ):
            snake = _camel_to_snake(key)
            if snake in field_names:
                out[snake] = value
                continue
        out[key] = value
    return out


class CamelCaseInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode="before")
    @classmethod
    def _accept_camel_case_keys(cls, data):
        if isinstance(data, dict):
            return _normalize_for_cls(cls, data)
        return data
