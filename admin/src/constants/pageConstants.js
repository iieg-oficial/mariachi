export const GRID_COLUMNS = [
    { value: 1, label: '1 Columna', description: 'Ancho completo' },
    { value: 2, label: '2 Columnas', description: '50% / 50%' },
    { value: 3, label: '3 Columnas', description: '33% / 33% / 33%' },
    { value: 4, label: '4 Columnas', description: '25% / 25% / 25% / 25%' }
];

export const COMPONENT_CATEGORIES = {
    BASIC: 'basic',
    MULTIMEDIA: 'multimedia',
    INTERACTIVE: 'interactive',
    DATA: 'data',
    SECTIONS: 'sections'
};

export const COMPONENT_TYPES = {
    TEXT: 'text',
    HEADING: 'heading',
    IMAGE: 'image',
    VIDEO: 'video',
    GALLERY: 'gallery',
    AUDIO: 'audio',
    BUTTON: 'button',
    FORM: 'form',
    ACCORDION: 'accordion',
    TABLE: 'table',
    CARD_LIST: 'card-list',
    LIST: 'list',
    HERO_BANNER: 'hero-banner',
    CAROUSEL: 'carousel',
    CARD_GRID: 'card-grid',
    INFO_SECTION: 'info-section',
    PROCUREMENT_LIST: 'procurement-list',
    CONTACT_FORM: 'contact-form',
    FEATURE_SHOWCASE: 'feature-showcase'
};

export const COMPONENT_CONFIG = {
    [COMPONENT_TYPES.TEXT]: {
        type: COMPONENT_TYPES.TEXT,
        label: 'Texto',
        category: COMPONENT_CATEGORIES.BASIC,
        icon: 'FileTextOutlined',
        defaultProps: {
            content: 'Escribe tu texto aquí...',
            fontSize: 14,
            color: '#000000'
        }
    },
    [COMPONENT_TYPES.HEADING]: {
        type: COMPONENT_TYPES.HEADING,
        label: 'Título',
        category: COMPONENT_CATEGORIES.BASIC,
        icon: 'FontSizeOutlined',
        defaultProps: {
            content: 'Título',
            level: 2,
            color: '#000000'
        }
    },
    [COMPONENT_TYPES.IMAGE]: {
        type: COMPONENT_TYPES.IMAGE,
        label: 'Imagen',
        category: COMPONENT_CATEGORIES.BASIC,
        icon: 'PictureOutlined',
        defaultProps: {
            src: '',
            alt: 'Imagen',
            width: '100%',
            height: 'auto'
        }
    },
    [COMPONENT_TYPES.VIDEO]: {
        type: COMPONENT_TYPES.VIDEO,
        label: 'Video',
        category: COMPONENT_CATEGORIES.MULTIMEDIA,
        icon: 'PlayCircleOutlined',
        defaultProps: {
            url: '',
            autoplay: false,
            controls: true
        }
    },
    [COMPONENT_TYPES.GALLERY]: {
        type: COMPONENT_TYPES.GALLERY,
        label: 'Galería',
        category: COMPONENT_CATEGORIES.MULTIMEDIA,
        icon: 'AppstoreOutlined',
        defaultProps: {
            images: [],
            columns: 3
        }
    },
    [COMPONENT_TYPES.AUDIO]: {
        type: COMPONENT_TYPES.AUDIO,
        label: 'Audio',
        category: COMPONENT_CATEGORIES.MULTIMEDIA,
        icon: 'SoundOutlined',
        defaultProps: {
            url: '',
            autoplay: false,
            controls: true
        }
    },
    [COMPONENT_TYPES.BUTTON]: {
        type: COMPONENT_TYPES.BUTTON,
        label: 'Botón',
        category: COMPONENT_CATEGORIES.INTERACTIVE,
        icon: 'BorderOutlined',
        defaultProps: {
            text: 'Haz clic aquí',
            link: '',
            type: 'primary',
            size: 'middle'
        }
    },
    [COMPONENT_TYPES.FORM]: {
        type: COMPONENT_TYPES.FORM,
        label: 'Formulario',
        category: COMPONENT_CATEGORIES.INTERACTIVE,
        icon: 'FormOutlined',
        defaultProps: {
            fields: [],
            submitText: 'Enviar'
        }
    },
    [COMPONENT_TYPES.ACCORDION]: {
        type: COMPONENT_TYPES.ACCORDION,
        label: 'Acordeón',
        category: COMPONENT_CATEGORIES.INTERACTIVE,
        icon: 'MenuUnfoldOutlined',
        defaultProps: {
            items: [
                { title: 'Item 1', content: 'Contenido 1' }
            ]
        }
    },
    [COMPONENT_TYPES.TABLE]: {
        type: COMPONENT_TYPES.TABLE,
        label: 'Tabla',
        category: COMPONENT_CATEGORIES.DATA,
        icon: 'TableOutlined',
        defaultProps: {
            columns: [],
            data: []
        }
    },
    [COMPONENT_TYPES.CARD_LIST]: {
        type: COMPONENT_TYPES.CARD_LIST,
        label: 'Lista de Cards',
        category: COMPONENT_CATEGORIES.DATA,
        icon: 'ContainerOutlined',
        defaultProps: {
            cards: [],
            columns: 3
        }
    },
    [COMPONENT_TYPES.LIST]: {
        type: COMPONENT_TYPES.LIST,
        label: 'Lista',
        category: COMPONENT_CATEGORIES.DATA,
        icon: 'UnorderedListOutlined',
        defaultProps: {
            items: ['Item 1', 'Item 2', 'Item 3'],
            type: 'bullet'
        }
    },

    [COMPONENT_TYPES.HERO_BANNER]: {
        type: COMPONENT_TYPES.HERO_BANNER,
        label: 'Banner Hero',
        category: COMPONENT_CATEGORIES.SECTIONS,
        icon: 'PictureOutlined',
        defaultProps: {
            title: 'Bienvenido',
            subtitle: 'Descripción del banner',
            backgroundGradient: 'from-purple-900 to-purple-700',
            ctaButtons: [
                { text: 'Conoce más', link: '#', type: 'primary' },
                { text: 'Ver más', link: '#', type: 'secondary' }
            ],
            statistics: [
                { value: '50+', label: 'Sistemas' },
                { value: '1000+', label: 'Datasets' },
                { value: '100%', label: 'Datos Abiertos' },
                { value: '24/7', label: 'Access' }
            ],
            showStatistics: true
        }
    },
    [COMPONENT_TYPES.CAROUSEL]: {
        type: COMPONENT_TYPES.CAROUSEL,
        label: 'Carrusel',
        category: COMPONENT_CATEGORIES.SECTIONS,
        icon: 'HeatMapOutlined',
        defaultProps: {
            slides: [
                {
                    icon: '📊',
                    category: 'Actualización',
                    title: 'Nueva actualización',
                    description: 'Descripción de la actualización',
                    date: new Date().toISOString(),
                    link: '#'
                }
            ],
            autoplay: true,
            interval: 5000,
            showDots: true,
            showArrows: true
        }
    },
    [COMPONENT_TYPES.CARD_GRID]: {
        type: COMPONENT_TYPES.CARD_GRID,
        label: 'Grid de Cards',
        category: COMPONENT_CATEGORIES.SECTIONS,
        icon: 'AppstoreOutlined',
        defaultProps: {
            title: 'Información Reciente',
            cards: [
                {
                    icon: '📊',
                    badge: 'Nuevo',
                    badgeColor: 'purple',
                    title: 'Título del card',
                    description: 'Descripción del contenido',
                    date: new Date().toISOString(),
                    link: '#',
                    featured: false
                }
            ],
            columns: 3,
            showCta: true,
            ctaText: 'Ver todo',
            ctaLink: '#'
        }
    },
    [COMPONENT_TYPES.INFO_SECTION]: {
        type: COMPONENT_TYPES.INFO_SECTION,
        label: 'Sección Informativa',
        category: COMPONENT_CATEGORIES.SECTIONS,
        icon: 'InfoCircleOutlined',
        defaultProps: {
            title: 'Información',
            cards: [
                {
                    title: 'Título de la sección',
                    description: 'Descripción',
                    features: ['Característica 1', 'Característica 2'],
                    links: [
                        { text: 'Enlace 1', url: '#' }
                    ]
                }
            ],
            layout: 'grid'
        }
    },
    [COMPONENT_TYPES.PROCUREMENT_LIST]: {
        type: COMPONENT_TYPES.PROCUREMENT_LIST,
        label: 'Lista de Licitaciones',
        category: COMPONENT_CATEGORIES.SECTIONS,
        icon: 'FileDoneOutlined',
        defaultProps: {
            title: 'Licitaciones y Convocatorias',
            items: [
                {
                    title: 'Licitación ejemplo',
                    number: 'LP-001-2024',
                    status: 'active',
                    date: new Date().toISOString(),
                    link: '#'
                }
            ],
            externalLink: {
                text: 'Ver en CompraNet',
                url: 'https://compranet.hacienda.gob.mx'
            },
            showGuide: true,
            guideSteps: [
                'Paso 1: Revisar convocatoria',
                'Paso 2: Preparar documentación',
                'Paso 3: Enviar propuesta'
            ]
        }
    },
    [COMPONENT_TYPES.CONTACT_FORM]: {
        type: COMPONENT_TYPES.CONTACT_FORM,
        label: 'Formulario de Contacto',
        category: COMPONENT_CATEGORIES.SECTIONS,
        icon: 'MailOutlined',
        defaultProps: {
            title: 'Contacto',
            showContactInfo: true,
            contactInfo: {
                address: 'Dirección del IIEG',
                phone: '33 1234 5678',
                email: 'contacto@iieg.gob.mx',
                hours: 'Lunes a Viernes, 9:00 - 18:00'
            },
            showMap: true,
            mapEmbedUrl: '',
            formFields: [
                { name: 'nombre', label: 'Nombre', type: 'text', required: true },
                { name: 'email', label: 'Email', type: 'email', required: true },
                { name: 'telefono', label: 'Teléfono', type: 'tel', required: false },
                { name: 'asunto', label: 'Asunto', type: 'text', required: true },
                { name: 'mensaje', label: 'Mensaje', type: 'textarea', required: true }
            ],
            submitText: 'Enviar mensaje',
            submitEndpoint: '/api/contact'
        }
    },
    [COMPONENT_TYPES.FEATURE_SHOWCASE]: {
        type: COMPONENT_TYPES.FEATURE_SHOWCASE,
        label: 'Destacado',
        category: COMPONENT_CATEGORIES.SECTIONS,
        icon: 'StarOutlined',
        defaultProps: {
            title: 'Sistema Destacado',
            description: 'Descripción del sistema destacado',
            features: [
                'Característica 1',
                'Característica 2',
                'Característica 3'
            ],
            ctaButtons: [
                { text: 'Explorar', link: '#', type: 'primary' },
                { text: 'Más info', link: '#', type: 'secondary' }
            ],
            visualContent: {
                type: 'image',
                src: ''
            },
            statistics: [
                { label: 'Métrica 1', value: '100+' },
                { label: 'Métrica 2', value: '50km²' }
            ],
            layout: 'two-column'
        }
    }
};

export const getComponentsByCategory = (category) => {
    return Object.values(COMPONENT_CONFIG).filter(
        component => component.category === category
    );
};

export const CATEGORY_LABELS = {
    [COMPONENT_CATEGORIES.BASIC]: 'Básicos',
    [COMPONENT_CATEGORIES.MULTIMEDIA]: 'Multimedia',
    [COMPONENT_CATEGORIES.INTERACTIVE]: 'Interactivos',
    [COMPONENT_CATEGORIES.DATA]: 'Datos',
    [COMPONENT_CATEGORIES.SECTIONS]: 'Secciones'
};
