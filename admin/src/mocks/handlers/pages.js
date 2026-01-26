import { http, HttpResponse } from 'msw';
import { pagesData } from '../data/pages';
import { logHistory, getCurrentUserId } from '../utils/historyLogger';

let pages = [...pagesData];

export const pageHandlers = [
    http.get('/pages/:id', async ({ params }) => {
        const page = pages.find(p => p.menuItemId === params.id);

        if (!page) {
            return HttpResponse.json({
                id: params.id,
                menuItemId: params.id,
                title: '',
                slug: '',
                sections: [],
                publishedAt: null,
                updatedAt: new Date().toISOString()
            });
        }

        return HttpResponse.json(page);
    }),

    http.put('/pages/:id', async ({ params, request }) => {
        try {
            const updates = await request.json();
            const pageIndex = pages.findIndex(p => p.menuItemId === params.id);
            const userId = getCurrentUserId();

            if (pageIndex === -1) {
                const newPage = {
                    id: String(pages.length + 1),
                    menuItemId: params.id,
                    ...updates,
                    publishedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                pages.push(newPage);

                if (userId) {
                    logHistory({
                        userId,
                        action: 'create',
                        resource: 'page',
                        resourceId: newPage.menuItemId,
                        description: `Creó la página "${newPage.title || 'Sin título'}"`,
                        details: {
                            sections: newPage.sections?.length || 0
                        }
                    });
                }

                return HttpResponse.json(newPage);
            }

            const oldPage = { ...pages[pageIndex] };
            pages[pageIndex] = {
                ...pages[pageIndex],
                ...updates,
                id: pages[pageIndex].id,
                menuItemId: pages[pageIndex].menuItemId,
                publishedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            if (userId) {
                logHistory({
                    userId,
                    action: 'update',
                    resource: 'page',
                    resourceId: pages[pageIndex].menuItemId,
                    description: `Editó la página "${pages[pageIndex].title || 'Sin título'}"`,
                    details: {
                        sections: pages[pageIndex].sections?.length || 0,
                        components: pages[pageIndex].sections?.reduce((acc, section) =>
                            acc + section.items?.reduce((sum, item) =>
                                sum + (item.components?.length || 0), 0
                            ), 0
                        ) || 0
                    }
                });
            }

            return HttpResponse.json(pages[pageIndex]);
        } catch (error) {
            console.error('Error updating page:', error);
            return HttpResponse.json(
                { error: 'Error interno del servidor' },
                { status: 500 }
            );
        }
    }),

    http.get('/pages', async () => {
        return HttpResponse.json(pages);
    }),

    http.delete('/pages/:id', async ({ params }) => {
        const pageIndex = pages.findIndex(p => p.menuItemId === params.id);

        if (pageIndex === -1) {
            return HttpResponse.json(
                { error: 'Página no encontrada' },
                { status: 404 }
            );
        }

        pages.splice(pageIndex, 1);

        return HttpResponse.json(
            { message: 'Página eliminada exitosamente' },
            { status: 200 }
        );
    })
];
