import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

vi.mock('@shared/services/api', () => ({ default: { get: vi.fn() } }));

import api from '@shared/services/api';
import NodosPage from '@features/nodos/pages/NodosPage';
import respuestaReal from './nodos-real.json';

describe('NodosPage con una respuesta real del monitor', () => {
    beforeEach(() => {
        api.get.mockReset();
        api.get.mockResolvedValue({ data: respuestaReal });
    });

    it('los medidores del nodo se llenan con las métricas que llegan', async () => {
        const { baseElement } = render(<MemoryRouter><NodosPage /></MemoryRouter>);
        await waitFor(() => expect(screen.getByLabelText(/^S1:/)).toBeInTheDocument());
        fireEvent.click(screen.getByLabelText(/^S1:/));
        await screen.findByRole('dialog');

        const anchos = Array.from(baseElement.querySelectorAll('.ant-progress-track'))
            .map((barra) => barra.style.width);

        expect(anchos).toHaveLength(4);
        expect(anchos.every((ancho) => ancho === '0%')).toBe(false);
    });

    it('el catálogo no pisa las métricas del host con el hostname', async () => {
        render(<MemoryRouter><NodosPage /></MemoryRouter>);
        await waitFor(() => expect(screen.getByLabelText(/^S1:/)).toBeInTheDocument());
        fireEvent.click(screen.getByLabelText(/^S1:/));
        await screen.findByRole('dialog');

        expect(screen.queryByText('Este nodo no tiene reportero de host')).not.toBeInTheDocument();
        expect(screen.getByText(/^gateway ·/)).toBeInTheDocument();
    });
});
