import { http, HttpResponse } from 'msw';
import { layoutsData } from '../data/layouts';

let layouts = { ...layoutsData };

export const layoutsHandlers = [
    http.get('/layouts', async () => {
        return HttpResponse.json(layouts);
    }),

    http.get('/layouts/header', async () => {
        return HttpResponse.json(layouts.header);
    }),

    http.get('/layouts/footer', async () => {
        return HttpResponse.json(layouts.footer);
    }),

    http.put('/layouts/header', async ({ request }) => {
        try {
            const updates = await request.json();
            layouts.header = {
                ...layouts.header,
                ...updates
            };
            return HttpResponse.json(layouts.header);
        } catch {
            return HttpResponse.json(
                { error: 'Error interno del servidor' },
                { status: 500 }
            );
        }
    }),

    http.put('/layouts/footer', async ({ request }) => {
        try {
            const updates = await request.json();
            layouts.footer = {
                ...layouts.footer,
                ...updates
            };
            return HttpResponse.json(layouts.footer);
        } catch {
            return HttpResponse.json(
                { error: 'Error interno del servidor' },
                { status: 500 }
            );
        }
    })
];
