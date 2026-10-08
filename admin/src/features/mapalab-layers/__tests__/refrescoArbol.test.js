import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { refrescarArbol, VENTANA_NOTIFICADOR_MS } from '@features/mapalab-layers/utils/refrescoArbol';

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

describe('refrescarArbol', () => {
    it('recarga de inmediato y otra vez pasada la ventana del notificador', async () => {
        const reload = vi.fn(() => Promise.resolve());
        await refrescarArbol(reload);
        expect(reload).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(VENTANA_NOTIFICADOR_MS + 100);
        expect(reload).toHaveBeenCalledTimes(2);
    });

    it('al vuelo no espera la segunda pasada', async () => {
        const reload = vi.fn(() => Promise.resolve());
        const t = Date.now();
        await refrescarArbol(reload);
        expect(Date.now() - t).toBeLessThan(VENTANA_NOTIFICADOR_MS);
    });

    it('sin alVuelo espera las dos', async () => {
        const reload = vi.fn(() => Promise.resolve());
        const promesa = refrescarArbol(reload, { alVuelo: false });
        await vi.advanceTimersByTimeAsync(VENTANA_NOTIFICADOR_MS + 100);
        await promesa;
        expect(reload).toHaveBeenCalledTimes(2);
    });

    it('un fallo de la segunda pasada no revienta al que guardó', async () => {
        const reload = vi.fn()
            .mockImplementationOnce(() => Promise.resolve())
            .mockImplementationOnce(() => Promise.reject(new Error('sin red')));
        await expect(refrescarArbol(reload)).resolves.toBeUndefined();
        await vi.advanceTimersByTimeAsync(VENTANA_NOTIFICADOR_MS + 100);
        expect(reload).toHaveBeenCalledTimes(2);
    });

    it('sin funcion de recarga no hace nada', async () => {
        await expect(refrescarArbol(null)).resolves.toBeUndefined();
    });
});
