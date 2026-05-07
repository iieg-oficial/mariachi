from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

FieldType = Literal[
    "text",
    "textarea",
    "email",
    "url",
    "number",
    "select",
    "multiselect",
    "radio",
    "checkbox",
    "file",
    "direccion",
]

_TYPES_REQUIRING_OPTIONS = {"select", "multiselect", "radio"}


class FormFieldOption(BaseModel):
    value: str = Field(..., min_length=1, max_length=100)
    label: str = Field(..., min_length=1, max_length=200)


class FormFieldDef(BaseModel):
    key: str = Field(..., min_length=1, max_length=50, pattern=r"^[a-zA-Z][a-zA-Z0-9_]*$")
    label: str = Field(..., min_length=1, max_length=200)
    type: FieldType
    required: bool = False
    placeholder: str | None = Field(default=None, max_length=200)
    help_text: str | None = Field(default=None, max_length=500, alias="helpText")
    max_length: int | None = Field(default=None, ge=1, le=10000, alias="maxLength")
    options: list[FormFieldOption] | None = None

    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode="after")
    def _check_options(self) -> "FormFieldDef":
        if self.type in _TYPES_REQUIRING_OPTIONS and not self.options:
            raise ValueError(f"El campo '{self.key}' tipo '{self.type}' requiere opciones")
        if self.type not in _TYPES_REQUIRING_OPTIONS and self.options:
            self.options = None
        return self


class FormSchemaDef(BaseModel):
    campos: list[FormFieldDef] = Field(default_factory=list)

    @model_validator(mode="after")
    def _check_unique_keys(self) -> "FormSchemaDef":
        seen = set()
        for campo in self.campos:
            if campo.key in seen:
                raise ValueError(f"Key duplicada en form_schema: '{campo.key}'")
            seen.add(campo.key)
        return self


def validate_respuestas(respuestas: dict, schema: dict | None) -> dict:
    """Valida un dict de respuestas contra un form_schema. Devuelve el dict
    filtrado solo con keys declaradas en el schema. Levanta ValueError si falla.
    """
    if not schema or not isinstance(schema, dict):
        return {}
    try:
        parsed = FormSchemaDef.model_validate(schema)
    except Exception as exc:
        raise ValueError(f"form_schema inválido: {exc}") from exc

    if not isinstance(respuestas, dict):
        raise ValueError("respuestas debe ser un objeto JSON")

    out: dict = {}
    for campo in parsed.campos:
        valor = respuestas.get(campo.key)
        if valor is None or valor == "":
            if campo.required:
                raise ValueError(f"Campo requerido faltante: '{campo.key}'")
            continue

        if campo.type == "multiselect":
            if not isinstance(valor, list):
                raise ValueError(f"'{campo.key}' debe ser lista")
            allowed = {opt.value for opt in (campo.options or [])}
            for item in valor:
                if item not in allowed:
                    raise ValueError(f"'{campo.key}': valor '{item}' no permitido")
            out[campo.key] = valor
            continue

        if campo.type in {"select", "radio"}:
            allowed = {opt.value for opt in (campo.options or [])}
            if valor not in allowed:
                raise ValueError(f"'{campo.key}': valor '{valor}' no permitido")
            out[campo.key] = valor
            continue

        if campo.type == "checkbox":
            out[campo.key] = bool(valor)
            continue

        if campo.type == "number":
            try:
                out[campo.key] = float(valor) if not isinstance(valor, (int, float)) else valor
            except (TypeError, ValueError):
                raise ValueError(f"'{campo.key}': debe ser número")
            continue

        if campo.type in {"text", "textarea", "email", "url"}:
            text_value = str(valor)
            if campo.max_length and len(text_value) > campo.max_length:
                raise ValueError(f"'{campo.key}': excede {campo.max_length} caracteres")
            out[campo.key] = text_value
            continue

        out[campo.key] = valor
    return out
