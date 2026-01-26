import { http, HttpResponse } from 'msw';
import { stylesData } from '../data/styles';
import { logHistory, getCurrentUserId } from '../utils/historyLogger';

let styles = { ...stylesData };

export const styleHandlers = [
    http.get('/styles', async () => {
        return HttpResponse.json(styles);
    }),

    http.put('/styles', async ({ request }) => {
        try {
            const updates = await request.json();
            const userId = getCurrentUserId();

            styles = {
                ...styles,
                ...updates
            };

            if (userId) {
                logHistory({
                    userId,
                    action: 'update',
                    resource: 'styles',
                    resourceId: 'global',
                    description: 'Actualizó los estilos globales',
                    details: {
                        typography: updates.typography ? 'Modificó tipografías' : undefined,
                        colors: updates.colors ? 'Modificó colores' : undefined
                    }
                });
            }

            return HttpResponse.json(styles);
        } catch (error) {
            console.error('Error updating styles:', error);
            return HttpResponse.json(
                { error: 'Error interno del servidor' },
                { status: 500 }
            );
        }
    })
];
