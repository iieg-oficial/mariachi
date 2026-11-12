import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import MarcaEntorno from '@app/MarcaEntorno';

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('MarcaEntorno', () => {
    it('en testing muestra la píldora', () => {
        vi.stubEnv('VITE_APP_ENV', 'testing');
        render(<MarcaEntorno />);
        expect(screen.getByText('Testing')).toBeTruthy();
    });

    it('colapsada muestra solo el punto', () => {
        vi.stubEnv('VITE_APP_ENV', 'testing');
        render(<MarcaEntorno compact />);
        expect(screen.getByRole('img', { name: 'Testing' })).toBeTruthy();
        expect(screen.queryByText('Testing')).toBeNull();
    });

    it('en producción no muestra nada', () => {
        vi.stubEnv('VITE_APP_ENV', 'prod');
        const { container } = render(<MarcaEntorno />);
        expect(container.innerHTML).toBe('');
    });
});

describe('MarcaEntorno, enlace a producción', () => {
    it('el tooltip lleva a producción cuando hay URL', async () => {
        vi.stubEnv('VITE_APP_ENV', 'testing');
        vi.stubEnv('VITE_PRODUCCION_URL', 'https://produccion.ejemplo/mariachi/');
        render(<MarcaEntorno />);
        fireEvent.mouseEnter(screen.getByText('Testing'));
        const enlace = await screen.findByRole('link', { name: 'Ir a producción' });
        expect(enlace.getAttribute('href')).toBe('https://produccion.ejemplo/mariachi/');
        expect(enlace.getAttribute('target')).toBe('_blank');
    });

    it('sin URL el tooltip no lleva enlace', async () => {
        vi.stubEnv('VITE_APP_ENV', 'testing');
        vi.stubEnv('VITE_PRODUCCION_URL', '');
        render(<MarcaEntorno />);
        fireEvent.mouseEnter(screen.getByText('Testing'));
        expect(await screen.findByText(/Espejo en Proxmox/)).toBeTruthy();
        expect(screen.queryByRole('link')).toBeNull();
    });
});
