import { COMPONENT_TYPES } from '@constants/pageConstants';

export const pagesData = [
    {
        id: '1',
        menuItemId: '1',
        title: 'Inicio',
        slug: '/',
        sections: [
            {
                id: 'section-1',
                columns: 1,
                order: 0,
                items: [
                    {
                        id: 'item-1',
                        order: 0,
                        components: [
                            {
                                id: 'comp-1',
                                type: COMPONENT_TYPES.HEADING,
                                order: 0,
                                props: {
                                    content: 'Bienvenido al Portal IIEG',
                                    level: 1,
                                    color: '#1890ff'
                                }
                            },
                            {
                                id: 'comp-2',
                                type: COMPONENT_TYPES.TEXT,
                                order: 1,
                                props: {
                                    content: 'Este es el portal de gestión de contenido del Instituto de Información Estadística y Geográfica.',
                                    fontSize: 16,
                                    color: '#595959'
                                }
                            }
                        ]
                    }
                ]
            }
        ],
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: '2',
        menuItemId: '2',
        title: 'Acerca de',
        slug: '/about',
        sections: [
            {
                id: 'section-1',
                columns: 2,
                order: 0,
                items: [
                    {
                        id: 'item-1',
                        order: 0,
                        components: [
                            {
                                id: 'comp-1',
                                type: COMPONENT_TYPES.HEADING,
                                order: 0,
                                props: {
                                    content: 'Nuestra Misión',
                                    level: 2,
                                    color: '#000000'
                                }
                            },
                            {
                                id: 'comp-2',
                                type: COMPONENT_TYPES.TEXT,
                                order: 1,
                                props: {
                                    content: 'Generar y difundir información estadística y geográfica de calidad.',
                                    fontSize: 14,
                                    color: '#595959'
                                }
                            }
                        ]
                    },
                    {
                        id: 'item-2',
                        order: 1,
                        components: [
                            {
                                id: 'comp-3',
                                type: COMPONENT_TYPES.HEADING,
                                order: 0,
                                props: {
                                    content: 'Nuestra Visión',
                                    level: 2,
                                    color: '#000000'
                                }
                            },
                            {
                                id: 'comp-4',
                                type: COMPONENT_TYPES.TEXT,
                                order: 1,
                                props: {
                                    content: 'Ser un referente en la generación de información estadística y geográfica.',
                                    fontSize: 14,
                                    color: '#595959'
                                }
                            }
                        ]
                    }
                ]
            }
        ],
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: '3',
        menuItemId: '3',
        title: 'Servicios',
        slug: '/services',
        sections: [],
        publishedAt: null,
        updatedAt: new Date().toISOString()
    },
    {
        id: '4',
        menuItemId: '4',
        title: 'Estadísticas',
        slug: '/stats',
        sections: [],
        publishedAt: null,
        updatedAt: new Date().toISOString()
    },
    {
        id: '5',
        menuItemId: '5',
        title: 'Censos',
        slug: '/stats/census',
        sections: [],
        publishedAt: null,
        updatedAt: new Date().toISOString()
    },
    {
        id: '6',
        menuItemId: '6',
        title: 'Censo 2025',
        slug: '/stats/census/2025',
        sections: [],
        publishedAt: null,
        updatedAt: new Date().toISOString()
    },
    {
        id: '7',
        menuItemId: '7',
        title: 'Cartografía',
        slug: '/cartography',
        sections: [],
        publishedAt: null,
        updatedAt: new Date().toISOString()
    },
    {
        id: '8',
        menuItemId: '8',
        title: 'Contacto',
        slug: '/contact',
        sections: [],
        publishedAt: null,
        updatedAt: new Date().toISOString()
    }
];
