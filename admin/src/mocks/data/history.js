export const historyData = [
    {
        id: '1',
        userId: '3',
        userName: 'Diseñadora Gráfica',
        userRole: 'diseñadora',
        action: 'update',
        resource: 'styles',
        resourceId: 'global',
        description: 'Actualizó los estilos globales',
        details: {
            changes: ['Cambió color primario', 'Actualizó fuente principal']
        },
        timestamp: new Date('2025-10-30T10:30:00').toISOString()
    },
    {
        id: '2',
        userId: '2',
        userName: 'Editora de Contenidos',
        userRole: 'editora',
        action: 'update',
        resource: 'page',
        resourceId: '1',
        description: 'Editó la página "Inicio"',
        details: {
            sections: 2,
            components: 4
        },
        timestamp: new Date('2025-10-30T09:15:00').toISOString()
    },
    {
        id: '3',
        userId: '3',
        userName: 'Diseñadora Gráfica',
        userRole: 'diseñadora',
        action: 'create',
        resource: 'menu',
        resourceId: '9',
        description: 'Creó nuevo item de menú "Blog"',
        details: {
            label: 'Blog',
            url: '/blog',
            parentId: null
        },
        timestamp: new Date('2025-10-29T16:45:00').toISOString()
    },
    {
        id: '4',
        userId: '2',
        userName: 'Editora de Contenidos',
        userRole: 'editora',
        action: 'update',
        resource: 'page',
        resourceId: '2',
        description: 'Editó la página "Acerca de"',
        details: {
            sections: 3,
            components: 6
        },
        timestamp: new Date('2025-10-29T14:20:00').toISOString()
    },
    {
        id: '5',
        userId: '3',
        userName: 'Diseñadora Gráfica',
        userRole: 'diseñadora',
        action: 'update',
        resource: 'menu',
        resourceId: '3',
        description: 'Actualizó el item de menú "Servicios"',
        details: {
            field: 'icon',
            oldValue: 'AppstoreOutlined',
            newValue: 'SettingOutlined'
        },
        timestamp: new Date('2025-10-29T11:00:00').toISOString()
    },
    {
        id: '6',
        userId: '1',
        userName: 'Administrador IIEG',
        userRole: 'tetlamamakani',
        action: 'create',
        resource: 'user',
        resourceId: '5',
        description: 'Creó nuevo usuario "Juan Pérez"',
        details: {
            username: 'jperez',
            role: 'editora'
        },
        timestamp: new Date('2025-10-28T10:00:00').toISOString()
    },
    {
        id: '7',
        userId: '3',
        userName: 'Diseñadora Gráfica',
        userRole: 'diseñadora',
        action: 'update',
        resource: 'layout',
        resourceId: '2',
        description: 'Actualizó el layout "Header Principal"',
        details: {
            changes: ['Modificó altura', 'Cambió color de fondo']
        },
        timestamp: new Date('2025-10-27T15:30:00').toISOString()
    },
    {
        id: '8',
        userId: '2',
        userName: 'Editora de Contenidos',
        userRole: 'editora',
        action: 'update',
        resource: 'page',
        resourceId: '5',
        description: 'Editó la página "Censos"',
        details: {
            sections: 1,
            components: 2
        },
        timestamp: new Date('2025-10-27T12:00:00').toISOString()
    },
    {
        id: '9',
        userId: '3',
        userName: 'Diseñadora Gráfica',
        userRole: 'diseñadora',
        action: 'delete',
        resource: 'menu',
        resourceId: '10',
        description: 'Eliminó el item de menú "Página antigua"',
        details: {
            label: 'Página antigua'
        },
        timestamp: new Date('2025-10-26T09:00:00').toISOString()
    },
    {
        id: '10',
        userId: '2',
        userName: 'Editora de Contenidos',
        userRole: 'editora',
        action: 'update',
        resource: 'page',
        resourceId: '3',
        description: 'Editó la página "Servicios"',
        details: {
            sections: 4,
            components: 8
        },
        timestamp: new Date('2025-10-25T16:30:00').toISOString()
    }
];

export const addHistoryEntry = (entry) => {
    const newEntry = {
        id: String(historyData.length + 1),
        timestamp: new Date().toISOString(),
        ...entry
    };
    historyData.unshift(newEntry); 
    return newEntry;
};
