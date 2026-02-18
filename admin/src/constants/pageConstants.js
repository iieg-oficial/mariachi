export const BLOCK_CATEGORIES = {
    MEDIA: 'media',
    LAYOUT: 'layout',
    DATA: 'data',
}

export const BLOCK_TYPES = {
    CAROUSEL: 'carousel',
}

export const BLOCK_CONFIG = {
    [BLOCK_TYPES.CAROUSEL]: {
        type: BLOCK_TYPES.CAROUSEL,
        label: 'Carrusel',
        description: 'Carrusel de slides con imagen de fondo, avatar, título, descripción y botón',
        category: BLOCK_CATEGORIES.MEDIA,
        icon: 'PlayCircleOutlined',
        defaultProps: {
            autoplay: true,
            interval: 5000,
            className: '',
            slides: [
                {
                    backgroundImage: '',
                    avatar: '',
                    title: 'Título del slide',
                    description: 'Descripción del contenido del slide.',
                    buttonText: 'Ver más',
                    buttonLink: '#'
                }
            ]
        },
        schema: [
            { name: 'autoplay', label: 'Reproducción automática', type: 'boolean' },
            { name: 'interval', label: 'Intervalo (ms)', type: 'number' },
            { name: 'className', label: 'Clases CSS (dimensiones, márgenes, etc.)', type: 'text' },
            {
                name: 'slides', label: 'Slides', type: 'list', itemSchema: [
                    { name: 'backgroundImage', label: 'Imagen de Fondo (URL)', type: 'image' },
                    { name: 'avatar', label: 'Avatar (URL)', type: 'image' },
                    { name: 'title', label: 'Título', type: 'text' },
                    { name: 'description', label: 'Descripción', type: 'textarea' },
                    { name: 'buttonText', label: 'Texto del Botón', type: 'text' },
                    { name: 'buttonLink', label: 'Enlace del Botón', type: 'text' }
                ]
            }
        ]
    },
}

export const getBlocksByCategory = (category) => {
    return Object.values(BLOCK_CONFIG).filter(block => block.category === category)
}
