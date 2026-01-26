import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

export async function startMockServiceWorker() {
    if (import.meta.env.DEV) {
        await worker.start({
            onUnhandledRequest: 'warn',
            serviceWorker: {
                url: '/mockServiceWorker.js'
            }
        });
    }
}
