from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator

from app.core.acervo_url import to_absolute, to_absolute_in, to_relative

HomeSectionKey = Literal['banner', 'topics', 'guide', 'select', 'faq', 'video', 'footer']


class BannerItem(BaseModel):
    id: str
    titulo: str = ''
    descripcion: str = ''
    imagen_url: str = Field(default='', serialization_alias='imagenUrl')
    logo_url: str = Field(default='', serialization_alias='logoUrl')
    cta_label: str = Field(default='', serialization_alias='ctaLabel')
    cta_href: str = Field(default='', serialization_alias='ctaHref')
    activo: bool = False

    model_config = ConfigDict(populate_by_name=True, extra='forbid')

    @field_validator('imagen_url', 'logo_url', mode='before')
    @classmethod
    def _store_relative(cls, v):
        return to_relative(v) or ''

    @field_serializer('imagen_url', 'logo_url', when_used='json')
    def _expose_absolute(self, v):
        return to_absolute(v) if v else v


class BannerPayload(BaseModel):
    items: list[BannerItem] = Field(default_factory=list)

    model_config = ConfigDict(extra='forbid')


class SubtopicItem(BaseModel):
    label: str = ''
    layer_ids: list[str] = Field(default_factory=list, serialization_alias='layerIds')
    link: str = ''

    model_config = ConfigDict(populate_by_name=True, extra='forbid')


class TopicItem(BaseModel):
    id: str
    titulo: str = ''
    descripcion: str = ''
    icon: str = ''
    imagen_url: str = Field(default='', serialization_alias='imagenUrl')
    link: str = ''
    subtopics: list[SubtopicItem] = Field(default_factory=list)
    activo: bool = True
    orden: int = 0

    model_config = ConfigDict(populate_by_name=True, extra='forbid')

    @field_validator('imagen_url', mode='before')
    @classmethod
    def _store_relative(cls, v):
        return to_relative(v) or ''

    @field_serializer('imagen_url', when_used='json')
    def _expose_absolute(self, v):
        return to_absolute(v) if v else v


class TopicsPayload(BaseModel):
    items: list[TopicItem] = Field(default_factory=list)

    model_config = ConfigDict(extra='forbid')


class GuideItem(BaseModel):
    id: str
    titulo: str = ''
    descripcion: str = ''
    imagen_url: str = Field(default='', serialization_alias='imagenUrl')
    orden: int = 0

    model_config = ConfigDict(populate_by_name=True, extra='forbid')

    @field_validator('imagen_url', mode='before')
    @classmethod
    def _store_relative(cls, v):
        return to_relative(v) or ''

    @field_serializer('imagen_url', when_used='json')
    def _expose_absolute(self, v):
        return to_absolute(v) if v else v


class GuidePayload(BaseModel):
    items: list[GuideItem] = Field(default_factory=list)

    model_config = ConfigDict(extra='forbid')


class SelectItem(BaseModel):
    id: str
    titulo: str = ''
    descripcion: str = ''
    imagen_url: str = Field(default='', serialization_alias='imagenUrl')
    color: str = ''
    link: str = ''
    orden: int = 0

    model_config = ConfigDict(populate_by_name=True, extra='forbid')

    @field_validator('imagen_url', mode='before')
    @classmethod
    def _store_relative(cls, v):
        return to_relative(v) or ''

    @field_serializer('imagen_url', when_used='json')
    def _expose_absolute(self, v):
        return to_absolute(v) if v else v


class SelectPayload(BaseModel):
    items: list[SelectItem] = Field(default_factory=list)

    model_config = ConfigDict(extra='forbid')


class FaqItem(BaseModel):
    id: str
    pregunta: str = ''
    respuesta: str = ''
    orden: int = 0

    model_config = ConfigDict(extra='forbid')


class FaqPayload(BaseModel):
    items: list[FaqItem] = Field(default_factory=list)

    model_config = ConfigDict(extra='forbid')


class VideoPayload(BaseModel):
    youtube_id: str = Field(default='', serialization_alias='youtubeId')
    titulo: str = ''
    descripcion: str = ''
    activo: bool = False

    model_config = ConfigDict(populate_by_name=True, extra='forbid')


class FooterLogo(BaseModel):
    id: str
    name: str = ''
    imagen_url: str = Field(default='', serialization_alias='imagenUrl')
    href: str = ''
    width: str = ''
    height: str = ''
    orden: int = 0

    model_config = ConfigDict(populate_by_name=True, extra='forbid')

    @field_validator('imagen_url', mode='before')
    @classmethod
    def _store_relative(cls, v):
        return to_relative(v) or ''

    @field_serializer('imagen_url', when_used='json')
    def _expose_absolute(self, v):
        return to_absolute(v) if v else v


class FooterPayload(BaseModel):
    copyright: str = ''
    privacy_policy_label: str = Field(default='', serialization_alias='privacyPolicyLabel')
    privacy_policy_href: str = Field(default='', serialization_alias='privacyPolicyHref')
    logos: list[FooterLogo] = Field(default_factory=list, max_length=3)

    model_config = ConfigDict(populate_by_name=True, extra='ignore')


SECTION_SCHEMAS: dict[str, type[BaseModel]] = {
    'banner': BannerPayload,
    'topics': TopicsPayload,
    'guide': GuidePayload,
    'select': SelectPayload,
    'faq': FaqPayload,
    'video': VideoPayload,
    'footer': FooterPayload,
}


class HomeSectionResponse(BaseModel):
    key: HomeSectionKey
    payload_published: dict = Field(..., serialization_alias='payloadPublished')
    payload_draft: dict = Field(..., serialization_alias='payloadDraft')
    updated_at: datetime = Field(..., serialization_alias='updatedAt')
    published_at: datetime | None = Field(default=None, serialization_alias='publishedAt')

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    @field_serializer('payload_published', 'payload_draft', when_used='json')
    def _expose_absolute(self, v):
        return to_absolute_in(v)


class HomePublicResponse(BaseModel):
    banner: BannerPayload
    topics: TopicsPayload
    guide: GuidePayload
    select: SelectPayload
    faq: FaqPayload
    video: VideoPayload
    footer: FooterPayload
