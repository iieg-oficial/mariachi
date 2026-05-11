import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ActividadPage from '@features/actividad/pages/ActividadPage';

vi.mock('@shared/services/api', () => ({
    default: { get: vi.fn() },
}));

vi.mock('@shared/services/message', () => ({
    message: { error: vi.fn() },
}));

vi.mock('@shared/hooks/useIsMobile', () => ({
    default: () => ({ isMobile: false }),
}));

import api from '@shared/services/api';

const sampleItems = [
    {
        id: 100,
        actor_id: 1,
        actor_role: 'tetlamamakani',
        action: 'user.create',
        resource_type: 'usuario',
        resource_id: '5',
        metadata: { role: 'editora', username: 'nuevo' },
        ip: '10.0.0.1',
        created_at: '2026-05-08T12:00:00Z',
    },
    {
        id: 101,
        actor_id: 1,
        actor_role: 'tetlamamakani',
        action: 'sieej.formulario.update',
        resource_type: 'sieej.formulario',
        resource_id: '12',
        metadata: { slug: 'levantamiento', definicion_changed: true, version_from: 1, version_to: 2 },
        ip: null,
        created_at: '2026-05-08T12:05:00Z',
    },
];

describe('ActividadPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renderiza titulo y descripcion al montar', async () => {
        api.get.mockResolvedValueOnce({ data: { total: 0, items: [] } });
        render(<ActividadPage />);
        expect(screen.getByText('Actividad')).toBeInTheDocument();
        expect(screen.getByText(/Audit log/)).toBeInTheDocument();
        expect(screen.getByPlaceholderText('ID del actor')).toBeInTheDocument();
    });

    it('llama al endpoint /actividad con paginacion default', async () => {
        api.get.mockResolvedValueOnce({ data: { total: 0, items: [] } });
        render(<ActividadPage />);
        await waitFor(() => {
            expect(api.get).toHaveBeenCalledWith('/actividad', {
                params: { page: 1, page_size: 50 },
            });
        });
    });

    it('muestra empty state cuando no hay items', async () => {
        api.get.mockResolvedValueOnce({ data: { total: 0, items: [] } });
        render(<ActividadPage />);
        await waitFor(() => {
            expect(screen.getByText(/Sin actividad con los filtros aplicados/)).toBeInTheDocument();
        });
    });

    it('renderiza items con accion, actor y recurso', async () => {
        api.get.mockResolvedValueOnce({ data: { total: 2, items: sampleItems } });
        render(<ActividadPage />);
        await waitFor(() => {
            expect(screen.getByText('user.create')).toBeInTheDocument();
            expect(screen.getByText('sieej.formulario.update')).toBeInTheDocument();
            expect(screen.getByText('usuario#5')).toBeInTheDocument();
            expect(screen.getByText('sieej.formulario#12')).toBeInTheDocument();
            expect(screen.getByText('Total 2 eventos')).toBeInTheDocument();
        });
    });

    it('muestra el rol del actor como tag', async () => {
        api.get.mockResolvedValueOnce({ data: { total: 1, items: [sampleItems[0]] } });
        render(<ActividadPage />);
        await waitFor(() => {
            expect(screen.getAllByText('Administradora').length).toBeGreaterThan(0);
        });
    });
});
