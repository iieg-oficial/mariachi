import {
    BannerEditor,
    TopicsEditor,
    GuideEditor,
    VideoEditor,
    SelectEditor,
    FaqEditor,
    FooterEditor,
} from './sectionEditors';

export const SECTION_DEFAULTS = {
    banner: { items: [] },
    topics: { items: [] },
    guide: { items: [] },
    video: { youtube_id: '', titulo: '', descripcion: '', activo: false },
    select: { items: [] },
    faq: { items: [] },
    footer: { copyright: '', privacy_policy_label: '', privacy_policy_href: '', logos: [] },
};

export const SECTION_REGISTRY = {
    banner: { label: 'Banner', Editor: BannerEditor },
    topics: { label: 'Temas', Editor: TopicsEditor },
    guide: { label: 'Guía', Editor: GuideEditor },
    video: { label: 'Video', Editor: VideoEditor },
    select: { label: 'Opciones', Editor: SelectEditor },
    faq: { label: 'Preguntas', Editor: FaqEditor },
    footer: { label: 'Footer', Editor: FooterEditor },
};

export const SECTION_KEYS = Object.keys(SECTION_REGISTRY);
