import '@testing-library/jest-dom/vitest';
import { afterAll } from 'vitest';

const siguienteVuelta = () => new Promise((resolve) => setTimeout(resolve, 0));

afterAll(async () => {
    for (let i = 0; i < 3; i += 1) {
        await siguienteVuelta();
    }
});
