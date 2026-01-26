import { http, HttpResponse } from 'msw';
import { historyData, addHistoryEntry } from '../data/history';

export const historyHandlers = [
    http.get('/history', async ({ request }) => {
        const url = new URL(request.url);
        const userId = url.searchParams.get('userId');
        const resource = url.searchParams.get('resource');
        const action = url.searchParams.get('action');
        const limit = parseInt(url.searchParams.get('limit') || '50');

        let filteredHistory = [...historyData];

        if (userId) {
            filteredHistory = filteredHistory.filter(entry => entry.userId === userId);
        }

        if (resource) {
            filteredHistory = filteredHistory.filter(entry => entry.resource === resource);
        }

        if (action) {
            filteredHistory = filteredHistory.filter(entry => entry.action === action);
        }

        filteredHistory = filteredHistory.slice(0, limit);

        return HttpResponse.json(filteredHistory);
    }),

    http.post('/history', async ({ request }) => {
        try {
            const entry = await request.json();

            if (!entry.userId || !entry.action || !entry.resource) {
                return HttpResponse.json(
                    { error: 'Campos requeridos: userId, action, resource' },
                    { status: 400 }
                );
            }

            const newEntry = addHistoryEntry(entry);
            return HttpResponse.json(newEntry, { status: 201 });
        } catch (error) {
            console.error('Error adding history entry:', error);
            return HttpResponse.json(
                { error: 'Error interno del servidor' },
                { status: 500 }
            );
        }
    }),

    http.get('/history/stats', async () => {
        const stats = {
            totalEntries: historyData.length,
            byUser: {},
            byResource: {},
            byAction: {},
            recentActivity: historyData.slice(0, 5)
        };

        historyData.forEach(entry => {
            stats.byUser[entry.userName] = (stats.byUser[entry.userName] || 0) + 1;
        });

        historyData.forEach(entry => {
            stats.byResource[entry.resource] = (stats.byResource[entry.resource] || 0) + 1;
        });

        historyData.forEach(entry => {
            stats.byAction[entry.action] = (stats.byAction[entry.action] || 0) + 1;
        });

        return HttpResponse.json(stats);
    })
];
