from enum import Enum

ENUM_NAME = "evento_estado"


class EventoEstado(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"

    @classmethod
    def values(cls) -> tuple[str, ...]:
        return tuple(member.value for member in cls)
