export const BLOCK_CATEGORIES = {
    BASIC: 'basic',
    MEDIA: 'media',
    LAYOUT: 'layout',
    DATA: 'data',
    HOME: 'home'
};

export const BLOCK_TYPES = {
    HERO: 'hero',
    RICH_TEXT: 'rich-text',
    FEATURES_GRID: 'features-grid',
    MEDIA_GALLERY: 'media-gallery',
    INFO_SECTION: 'info-section',
    CONTACT_FORM: 'contact-form',
    PROCUREMENT_LIST: 'procurement-list',

     
    HOME_HERO: 'home-hero',
    HOME_UPDATES_SLIDER: 'home-updates-slider',
    HOME_RECENT_INFO: 'home-recent-info',
    HOME_SISTEMAS: 'home-sistemas'
};

export const BLOCK_CONFIG = {
    [BLOCK_TYPES.HERO]: {
        type: BLOCK_TYPES.HERO,
        label: 'Hero Banner',
        description: 'Banner principal con título, imagen y llamada a la acción',
        category: BLOCK_CATEGORIES.BASIC,
        icon: 'PictureOutlined',
        defaultProps: {
            title: 'Bienvenido',
            subtitle: 'Subtítulo descriptivo',
            ctaText: 'Ver más',
            ctaLink: '#',
            backgroundImage: '',
            height: 'medium',  
            align: 'center'  
        },
        schema: [
            { name: 'title', label: 'Título', type: 'text', required: true },
            { name: 'subtitle', label: 'Subtítulo', type: 'textarea' },
            { name: 'backgroundImage', label: 'Imagen de Fondo (URL)', type: 'image' },
            { name: 'ctaText', label: 'Texto del Botón', type: 'text' },
            { name: 'ctaLink', label: 'Enlace del Botón', type: 'text' },
            {
                name: 'align', label: 'Alineación', type: 'select', options: [
                    { value: 'left', label: 'Izquierda' },
                    { value: 'center', label: 'Centro' },
                    { value: 'right', label: 'Derecha' }
                ]
            }
        ]
    },
    [BLOCK_TYPES.RICH_TEXT]: {
        type: BLOCK_TYPES.RICH_TEXT,
        label: 'Texto Enriquecido',
        description: 'Bloque de texto libre con formato',
        category: BLOCK_CATEGORIES.BASIC,
        icon: 'FileTextOutlined',
        defaultProps: {
            content: '<p>Escribe tu contenido aquí...</p>',
            padding: 'medium'
        },
        schema: [
            { name: 'content', label: 'Contenido', type: 'rich-text' },
            {
                name: 'padding', label: 'Espaciado Vertical', type: 'select', options: [
                    { value: 'none', label: 'Ninguno' },
                    { value: 'small', label: 'Pequeño' },
                    { value: 'medium', label: 'Medio' },
                    { value: 'large', label: 'Grande' }
                ]
            }
        ]
    },
    [BLOCK_TYPES.FEATURES_GRID]: {
        type: BLOCK_TYPES.FEATURES_GRID,
        label: 'Grid de Características',
        description: 'Tarjetas con iconos para destacar características',
        category: BLOCK_CATEGORIES.LAYOUT,
        icon: 'AppstoreOutlined',
        defaultProps: {
            title: 'Nuestras Características',
            columns: 3,
            cards: [
                { title: 'Característica 1', description: 'Descripción breve', icon: 'StarOutlined' },
                { title: 'Característica 2', description: 'Descripción breve', icon: 'HeartOutlined' },
                { title: 'Característica 3', description: 'Descripción breve', icon: 'ThunderboltOutlined' }
            ]
        },
        schema: [
            { name: 'title', label: 'Título de la Sección', type: 'text' },
            {
                name: 'columns', label: 'Columnas', type: 'select', options: [
                    { value: 2, label: '2 Columnas' },
                    { value: 3, label: '3 Columnas' },
                    { value: 4, label: '4 Columnas' }
                ]
            },
            {
                name: 'cards', label: 'Elementos', type: 'list', itemSchema: [
                    { name: 'title', label: 'Título', type: 'text' },
                    { name: 'description', label: 'Descripción', type: 'textarea' },
                    { name: 'icon', label: 'Icono (Ant Design)', type: 'text' }
                ]
            }
        ]
    },
    [BLOCK_TYPES.INFO_SECTION]: {
        type: BLOCK_TYPES.INFO_SECTION,
        label: 'Sección Informativa',
        description: 'Imagen y texto lado a lado',
        category: BLOCK_CATEGORIES.LAYOUT,
        icon: 'InfoCircleOutlined',
        defaultProps: {
            title: 'Sobre Nosotros',
            content: 'Descripción detallada...',
            image: '',
            imagePosition: 'right',  
            backgroundColor: 'white'  
        },
        schema: [
            { name: 'title', label: 'Título', type: 'text' },
            { name: 'content', label: 'Contenido', type: 'textarea' },
            { name: 'image', label: 'Imagen (URL)', type: 'image' },
            {
                name: 'imagePosition', label: 'Posición de Imagen', type: 'select', options: [
                    { value: 'left', label: 'Izquierda' },
                    { value: 'right', label: 'Derecha' }
                ]
            },
            {
                name: 'backgroundColor', label: 'Color de Fondo', type: 'select', options: [
                    { value: 'white', label: 'Blanco' },
                    { value: 'gray', label: 'Gris Claro' }
                ]
            }
        ]
    },
    [BLOCK_TYPES.MEDIA_GALLERY]: {
        type: BLOCK_TYPES.MEDIA_GALLERY,
        label: 'Galería Multimedia',
        description: 'Imágenes o videos en grid o carrusel',
        category: BLOCK_CATEGORIES.MEDIA,
        icon: 'PictureOutlined',
        defaultProps: {
            layout: 'grid',  
            items: []
        },
        schema: [
            {
                name: 'layout', label: 'Diseño', type: 'select', options: [
                    { value: 'grid', label: 'Cuadrícula' },
                    { value: 'carousel', label: 'Carrusel' }
                ]
            },
            {
                name: 'items', label: 'Imágenes', type: 'list', itemSchema: [
                    { name: 'src', label: 'URL Imagen', type: 'image' },
                    { name: 'caption', label: 'Leyenda', type: 'text' }
                ]
            }
        ]
    },
    [BLOCK_TYPES.CONTACT_FORM]: {
        type: BLOCK_TYPES.CONTACT_FORM,
        label: 'Formulario de Contacto',
        description: 'Formulario de contacto estándar',
        category: BLOCK_CATEGORIES.DATA,
        icon: 'MailOutlined',
        defaultProps: {
            title: 'Contáctanos',
            emailTo: 'contacto@iieg.gob.mx'
        },
        schema: [
            { name: 'title', label: 'Título', type: 'text' },
            { name: 'emailTo', label: 'Email destino', type: 'text' }
        ]
    },
    [BLOCK_TYPES.PROCUREMENT_LIST]: {
        type: BLOCK_TYPES.PROCUREMENT_LIST,
        label: 'Lista de Licitaciones',
        description: 'Listado automático de licitaciones recientes',
        category: BLOCK_CATEGORIES.DATA,
        icon: 'FileDoneOutlined',
        defaultProps: {
            limit: 5,
            showFilter: true
        },
        schema: [
            { name: 'limit', label: 'Cantidad a mostrar', type: 'number' },
            { name: 'showFilter', label: 'Mostrar filtros', type: 'boolean' }
        ]
    },

     
    [BLOCK_TYPES.HOME_HERO]: {
        type: BLOCK_TYPES.HOME_HERO,
        label: 'Hero Home',
        description: 'Banner principal de la página de inicio',
        category: BLOCK_CATEGORIES.HOME,
        icon: 'HomeOutlined',
        defaultProps: {
            title: 'Instituto de Información Estadística y Geográfica',
            subtitle: 'Generamos, integramos y difundimos información estadística y geográfica de calidad para el desarrollo de Jalisco.',
            cta1Text: 'Conoce más sobre el IIEG',
            cta1Link: '/conocenos',
            cta2Text: 'Datos Abiertos',
            cta2Link: '/datos-abiertos'
        },
        schema: [
            { name: 'title', label: 'Título Principal', type: 'text' },
            { name: 'subtitle', label: 'Subtítulo', type: 'textarea' },
            { name: 'cta1Text', label: 'Texto Botón 1', type: 'text' },
            { name: 'cta1Link', label: 'Enlace Botón 1', type: 'text' },
            { name: 'cta2Text', label: 'Texto Botón 2', type: 'text' },
            { name: 'cta2Link', label: 'Enlace Botón 2', type: 'text' }
        ]
    },
    [BLOCK_TYPES.HOME_UPDATES_SLIDER]: {
        type: BLOCK_TYPES.HOME_UPDATES_SLIDER,
        label: 'Slider de Actualizaciones',
        description: 'Carrusel de noticias y actualizaciones recientes',
        category: BLOCK_CATEGORIES.HOME,
        icon: 'PictureOutlined',
        defaultProps: {
            title: 'Actualizaciones Recientes',
            subtitle: 'Mantente informado con las últimas novedades del IIEG',
            items: [
                { title: 'Nueva Actualización', description: 'Descripción breve', date: 'Hoy', category: 'General', link: '#', icon: '📢' }
            ]
        },
        schema: [
            { name: 'title', label: 'Título Sección', type: 'text' },
            { name: 'subtitle', label: 'Subtítulo', type: 'text' },
            {
                name: 'items', label: 'Slides', type: 'list', itemSchema: [
                    { name: 'title', label: 'Título', type: 'text' },
                    { name: 'description', label: 'Descripción', type: 'textarea' },
                    { name: 'date', label: 'Fecha', type: 'text' },
                    { name: 'category', label: 'Categoría', type: 'text' },
                    { name: 'link', label: 'Enlace', type: 'text' },
                    { name: 'icon', label: 'Icono/Emoji', type: 'text' }
                ]
            }
        ]
    },
    [BLOCK_TYPES.HOME_RECENT_INFO]: {
        type: BLOCK_TYPES.HOME_RECENT_INFO,
        label: 'Grid Info Reciente',
        description: 'Cuadrícula de tarjetas de información reciente (colores)',
        category: BLOCK_CATEGORIES.HOME,
        icon: 'TableOutlined',
        defaultProps: {
            title: 'Información Más Reciente',
            subtitle: 'Accede a los datos, publicaciones e indicadores más actualizados',
            items: [
                { title: 'Nuevo Indicador', description: 'Descripción...', type: 'Indicador', date: 'Hoy', color: 'purple', link: '#', icon: '📊' }
            ],
            footerText: 'Ver todas las actualizaciones',
            footerLink: '/comunidad/noticias'
        },
        schema: [
            { name: 'title', label: 'Título Sección', type: 'text' },
            { name: 'subtitle', label: 'Subtítulo', type: 'text' },
            { name: 'footerText', label: 'Texto Pie', type: 'text' },
            { name: 'footerLink', label: 'Enlace Pie', type: 'text' },
            {
                name: 'items', label: 'Elementos', type: 'list', itemSchema: [
                    { name: 'title', label: 'Título', type: 'text' },
                    { name: 'description', label: 'Descripción', type: 'textarea' },
                    { name: 'type', label: 'Tipo (Etiqueta)', type: 'text' },
                    { name: 'date', label: 'Fecha', type: 'text' },
                    {
                        name: 'color', label: 'Color', type: 'select', options: [
                            { value: 'purple', label: 'Morado' },
                            { value: 'blue', label: 'Azul' },
                            { value: 'green', label: 'Verde' },
                            { value: 'orange', label: 'Naranja' }
                        ]
                    },
                    { name: 'link', label: 'Enlace', type: 'text' },
                    { name: 'icon', label: 'Icono/Emoji', type: 'text' }
                ]
            }
        ]
    },
    [BLOCK_TYPES.HOME_SISTEMAS]: {
        type: BLOCK_TYPES.HOME_SISTEMAS,
        label: 'Grid Sistemas',
        description: 'Cuadrícula de sistemas de información (destacados y lista)',
        category: BLOCK_CATEGORIES.HOME,
        icon: 'AppstoreOutlined',
        defaultProps: {
            title: 'Sistemas de Información',
            subtitle: 'Accede a nuestras herramientas y plataformas',
            items: [
                { name: 'Nuevo Sistema', description: 'Descripción...', featured: true, link: '#', icon: '💻' }
            ],
            footerText: 'Ver todos los sistemas',
            footerLink: '/sistemas'
        },
        schema: [
            { name: 'title', label: 'Título Sección', type: 'text' },
            { name: 'subtitle', label: 'Subtítulo', type: 'text' },
            { name: 'footerText', label: 'Texto Pie', type: 'text' },
            { name: 'footerLink', label: 'Enlace Pie', type: 'text' },
            {
                name: 'items', label: 'Sistemas', type: 'list', itemSchema: [
                    { name: 'name', label: 'Nombre', type: 'text' },
                    { name: 'description', label: 'Descripción', type: 'textarea' },
                    { name: 'featured', label: 'Destacado', type: 'boolean' },
                    { name: 'link', label: 'Enlace', type: 'text' },
                    { name: 'icon', label: 'Icono/Emoji', type: 'text' }
                ]
            }
        ]
    }
};

export const getBlocksByCategory = (category) => {
    return Object.values(BLOCK_CONFIG).filter(
        block => block.category === category
    );
};
