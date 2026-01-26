import { http, HttpResponse } from 'msw';
import { menuItemsData } from '../data/menu';
import { logHistory, getCurrentUserId } from '../utils/historyLogger';

let menuItems = [...menuItemsData];

const buildMenuTree = (items) => {
    const itemMap = {};
    const rootItems = [];

    items
        .filter(item => item.visible)
        .sort((a, b) => a.order - b.order)
        .forEach(item => {
            itemMap[item.id] = { ...item, children: [] };
        });

    Object.values(itemMap).forEach(item => {
        if (item.parentId && itemMap[item.parentId]) {
            itemMap[item.parentId].children.push(item);
        } else {
            rootItems.push(item);
        }
    });

    return rootItems;
};

export const menuHandlers = [
    http.get('/menu-items', async () => {
        return HttpResponse.json(menuItems);
    }),

    http.get('/menu-items/tree', async () => {
        const tree = buildMenuTree(menuItems);
        return HttpResponse.json(tree);
    }),

    http.get('/menu-items/:id', async ({ params }) => {
        const item = menuItems.find(i => i.id === params.id);

        if (!item) {
            return HttpResponse.json(
                { error: 'Item no encontrado' },
                { status: 404 }
            );
        }

        return HttpResponse.json(item);
    }),

    http.post('/menu-items', async ({ request }) => {
        try {
            const newItem = await request.json();
            const userId = getCurrentUserId();

            if (!newItem.label || !newItem.url) {
                return HttpResponse.json(
                    { error: 'Etiqueta y URL son requeridos' },
                    { status: 400 }
                );
            }

            const item = {
                id: String(menuItems.length + 1),
                ...newItem,
                order: newItem.order || 0,
                visible: newItem.visible !== undefined ? newItem.visible : true,
                external: newItem.external || false,
                parentId: newItem.parentId || null
            };

            menuItems.push(item);

            if (userId) {
                logHistory({
                    userId,
                    action: 'create',
                    resource: 'menu',
                    resourceId: item.id,
                    description: `Creó el item de menú "${item.label}"`,
                    details: {
                        url: item.url,
                        parentId: item.parentId,
                        external: item.external
                    }
                });
            }

            return HttpResponse.json(item, { status: 201 });
        } catch {
            return HttpResponse.json(
                { error: 'Error interno del servidor' },
                { status: 500 }
            );
        }
    }),

    http.put('/menu-items/:id', async ({ params, request }) => {
        try {
            const updates = await request.json();
            const itemIndex = menuItems.findIndex(i => i.id === params.id);
            const userId = getCurrentUserId();

            if (itemIndex === -1) {
                return HttpResponse.json(
                    { error: 'Item no encontrado' },
                    { status: 404 }
                );
            }

            const oldItem = { ...menuItems[itemIndex] };
            menuItems[itemIndex] = {
                ...menuItems[itemIndex],
                ...updates,
                id: menuItems[itemIndex].id
            };

            if (userId) {
                logHistory({
                    userId,
                    action: 'update',
                    resource: 'menu',
                    resourceId: menuItems[itemIndex].id,
                    description: `Actualizó el item de menú "${menuItems[itemIndex].label}"`,
                    details: {
                        oldLabel: oldItem.label !== menuItems[itemIndex].label ? oldItem.label : undefined,
                        oldUrl: oldItem.url !== menuItems[itemIndex].url ? oldItem.url : undefined
                    }
                });
            }

            return HttpResponse.json(menuItems[itemIndex]);
        } catch {
            return HttpResponse.json(
                { error: 'Error interno del servidor' },
                { status: 500 }
            );
        }
    }),

    http.delete('/menu-items/:id', async ({ params }) => {
        const itemIndex = menuItems.findIndex(i => i.id === params.id);
        const userId = getCurrentUserId();

        if (itemIndex === -1) {
            return HttpResponse.json(
                { error: 'Item no encontrado' },
                { status: 404 }
            );
        }

        const deletedItem = { ...menuItems[itemIndex] };
        menuItems.splice(itemIndex, 1);

        if (userId) {
            logHistory({
                userId,
                action: 'delete',
                resource: 'menu',
                resourceId: deletedItem.id,
                description: `Eliminó el item de menú "${deletedItem.label}"`,
                details: {
                    url: deletedItem.url
                }
            });
        }

        return HttpResponse.json(
            { message: 'Item eliminado exitosamente' },
            { status: 200 }
        );
    })
];
