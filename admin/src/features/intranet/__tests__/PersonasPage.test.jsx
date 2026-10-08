import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const permisos = { actuales: new Set() };

vi.mock('@shared/contexts/useAuth', () => ({
    useAuth: () => ({ can: (permiso) => permisos.actuales.has(permiso) }),
}));

vi.mock('../api/intranetService', () => ({
    listar: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    eliminar: vi.fn(),
    cambiarPresencia: vi.fn(),
}));

import { cambiarPresencia, listar } from '../api/intranetService';
import PersonasPage from '../pages/PersonasPage';

const PERSONAS = [
    { id: 3, nombre_completo: 'Ana Pérez', email: 'ana@iieg.gob.mx', oculto_en_presencia: false, created_at: '2026-09-01T10:00:00' },
    { id: 4, nombre_completo: 'Luis Gómez', email: null, oculto_en_presencia: true, created_at: '2026-09-02T10:00:00' },
];

beforeEach(() => {
    vi.clearAllMocks();
    permisos.actuales = new Set();
    listar.mockResolvedValue(PERSONAS);
});

describe('personas de la intranet', () => {
    it('solo con vista: lista y el interruptor no se puede mover', async () => {
        render(<PersonasPage />);
        await waitFor(() => expect(screen.getByText('Ana Pérez')).toBeTruthy());
        expect(listar).toHaveBeenCalledWith('personas');
        const interruptor = screen.getByLabelText('Mostrar el cursor de Ana Pérez');
        expect(interruptor.getAttribute('aria-checked')).toBe('true');
        expect(interruptor.disabled).toBe(true);
        expect(screen.getByLabelText('Mostrar el cursor de Luis Gómez').getAttribute('aria-checked')).toBe('false');
    });

    it('con el permiso de administrar oculta el cursor', async () => {
        permisos.actuales = new Set(['mariachi.intranet.manage']);
        cambiarPresencia.mockResolvedValue({ ...PERSONAS[0], oculto_en_presencia: true });
        render(<PersonasPage />);
        await waitFor(() => expect(screen.getByText('Ana Pérez')).toBeTruthy());
        fireEvent.click(screen.getByLabelText('Mostrar el cursor de Ana Pérez'));
        await waitFor(() => expect(cambiarPresencia).toHaveBeenCalledWith(3, true));
    });
});
