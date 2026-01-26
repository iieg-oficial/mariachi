import { http, HttpResponse } from 'msw';
import { iconsData } from '../data/icons';

let icons = [...iconsData];

export const iconHandlers = [
    http.get('/icons', async () => {
        return HttpResponse.json(icons);
    }),

    http.get('/icons/:id', async ({ params }) => {
        const icon = icons.find(i => i.id === params.id);

        if (!icon) {
            return HttpResponse.json(
                { error: 'Icono no encontrado' },
                { status: 404 }
            );
        }

        return HttpResponse.json(icon);
    }),

    http.post('/icons', async ({ request }) => {
        try {
            const newIcon = await request.json();

            if (!newIcon.name || !newIcon.svg) {
                return HttpResponse.json(
                    { error: 'Nombre y SVG son requeridos' },
                    { status: 400 }
                );
            }

            const icon = {
                id: String(icons.length + 1),
                name: newIcon.name,
                svg: newIcon.svg,
                createdAt: new Date().toISOString()
            };

            icons.push(icon);
            return HttpResponse.json(icon, { status: 201 });
        } catch {
            return HttpResponse.json(
                { error: 'Error interno del servidor' },
                { status: 500 }
            );
        }
    }),

    http.put('/icons/:id', async ({ params, request }) => {
        try {
            const updates = await request.json();
            const iconIndex = icons.findIndex(i => i.id === params.id);

            if (iconIndex === -1) {
                return HttpResponse.json(
                    { error: 'Icono no encontrado' },
                    { status: 404 }
                );
            }

            icons[iconIndex] = {
                ...icons[iconIndex],
                ...updates,
                id: icons[iconIndex].id,
                createdAt: icons[iconIndex].createdAt
            };

            return HttpResponse.json(icons[iconIndex]);
        } catch {
            return HttpResponse.json(
                { error: 'Error interno del servidor' },
                { status: 500 }
            );
        }
    }),

    http.delete('/icons/:id', async ({ params }) => {
        const iconIndex = icons.findIndex(i => i.id === params.id);

        if (iconIndex === -1) {
            return HttpResponse.json(
                { error: 'Icono no encontrado' },
                { status: 404 }
            );
        }

        icons.splice(iconIndex, 1);

        return HttpResponse.json(
            { message: 'Icono eliminado exitosamente' },
            { status: 200 }
        );
    })
];
