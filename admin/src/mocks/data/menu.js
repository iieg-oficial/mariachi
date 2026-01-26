export const menuItemsData = [
    {
        id: '1',
        label: 'Inicio',
        url: '/',
        order: 0,
        visible: true,
        external: false,
        parentId: null
    },
    {
        id: '2',
        label: 'Acerca de',
        url: '/about',
        order: 1,
        visible: true,
        external: false,
        parentId: null
    },
    {
        id: '3',
        label: 'Servicios',
        url: '/services',
        order: 2,
        visible: true,
        external: false,
        parentId: null
    },
    {
        id: '4',
        label: 'Estadísticas',
        url: '/stats',
        order: 0,
        visible: true,
        external: false,
        parentId: '3'
    },
    {
        id: '5',
        label: 'Censos',
        url: '/stats/census',
        order: 0,
        visible: true,
        external: false,
        parentId: '4'
    },
    {
        id: '6',
        label: 'Censo 2025',
        url: '/stats/census/2025',
        order: 0,
        visible: true,
        external: false,
        parentId: '5'
    },
    {
        id: '7',
        label: 'Cartografía',
        url: '/cartography',
        order: 1,
        visible: true,
        external: false,
        parentId: '3'
    },
    {
        id: '8',
        label: 'Contacto',
        url: '/contact',
        order: 3,
        visible: true,
        external: false,
        parentId: null
    }
];
