import { describe, expect, it } from 'vitest';
import { acquireThumbSlot, releaseThumbSlot } from '@features/sextante/utils/thumbQueue';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('thumbQueue', () => {
    it('no deja pasar más de 6 a la vez y libera al soltar turno', async () => {
        let running = 0;
        let maxRunning = 0;
        const total = 40;

        const tasks = Array.from({ length: total }, () => acquireThumbSlot().then(() => {
            running += 1;
            maxRunning = Math.max(maxRunning, running);
        }));

        await flush();
        expect(maxRunning).toBe(6);

        for (let i = 0; i < total; i += 1) {
            running -= 1;
            releaseThumbSlot();
            await flush();
        }

        await Promise.all(tasks);
        expect(maxRunning).toBe(6);
    });

    it('un release de más no aumenta la concurrencia permitida', async () => {
        releaseThumbSlot();
        releaseThumbSlot();

        let running = 0;
        let maxRunning = 0;
        const tasks = Array.from({ length: 20 }, () => acquireThumbSlot().then(() => {
            running += 1;
            maxRunning = Math.max(maxRunning, running);
        }));

        await flush();
        expect(maxRunning).toBe(6);

        for (let i = 0; i < 20; i += 1) {
            running -= 1;
            releaseThumbSlot();
            await flush();
        }
        await Promise.all(tasks);
    });
});
