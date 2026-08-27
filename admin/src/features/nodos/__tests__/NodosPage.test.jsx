import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

vi.mock('@shared/services/api', () => ({
    default: { get: vi.fn() },
}));

import api from '@shared/services/api';
import NodosPage from '@features/nodos/pages/NodosPage';

const RESPUESTA = {
    environment: 'produccion',
    nodos: [
        {
            node: 'S1',
            status: 'ok',
            servicios: [
                { slug: 'mariachi', label: 'mariachi', status: 'ok', version: '2.21.0', uptime_24h: 100 },
                { slug: 'acervo', label: 'acervo', status: 'ok', version: '2.1.2', uptime_24h: 99 },
            ],
            host: {
                cores: 8, load_1m: 1.24, load_5m: 0.98, load_15m: 0.71,
                memory_used_percent: 41.2, memory_used_gb: 6.2, memory_total_gb: 15,
                swap_used_percent: 0, swap_used_gb: 0, uptime_seconds: 1900800,
            },
            peers: { S4: { status: 'ok', latency_ms: 6 } },
            containers: { total: 11, running: 11 },
        },
        {
            node: 'S4',
            status: 'ok',
            servicios: [{ slug: 'dataengine', label: 'dataengine', status: 'ok', version: '1.40.0', uptime_24h: 100 }],
            host: {},
            peers: {},
            containers: { total: 4, running: 4 },
        },
    ],
    eventos: [
        { slug: 'mariachi', from_status: 'down', to_status: 'ok', occurred_at: '2026-08-27T15:00:00Z', detail: null },
    ],
};

const montar = () => render(<MemoryRouter><NodosPage /></MemoryRouter>);

describe('NodosPage', () => {
    beforeEach(() => {
        api.get.mockReset();
        api.get.mockResolvedValue({ data: RESPUESTA });
    });

    it('pinta un nodo por servidor con su conteo de contenedores', async () => {
        montar();
        await waitFor(() => expect(screen.getByText('S1')).toBeInTheDocument());
        expect(screen.getByText('2 nodos')).toBeInTheDocument();
        expect(screen.getByText(/11\/11/)).toBeInTheDocument();
    });

    it('al hacer click en un nodo abre su detalle', async () => {
        montar();
        await waitFor(() => expect(screen.getByLabelText(/^S1:/)).toBeInTheDocument());
        fireEvent.click(screen.getByLabelText(/^S1:/));
        await waitFor(() => expect(screen.getByText('1.24 / 0.98 / 0.71')).toBeInTheDocument());
        expect(screen.getByText('6.2 / 15 GB')).toBeInTheDocument();
    });

    it('un nodo sin reportero de host lo dice en vez de mostrar ceros', async () => {
        montar();
        await waitFor(() => expect(screen.getByLabelText(/^S4:/)).toBeInTheDocument());
        fireEvent.click(screen.getByLabelText(/^S4:/));
        await waitFor(() => expect(
            screen.getByText('Este nodo no tiene reportero de host'),
        ).toBeInTheDocument());
    });

    it('lista las transiciones en la bitacora', async () => {
        montar();
        await waitFor(() => expect(screen.getByText('volvió a operar')).toBeInTheDocument());
        expect(screen.getByText('(venía de down)')).toBeInTheDocument();
    });

    it('avisa cuando hay servicios sin nodo declarado', async () => {
        api.get.mockResolvedValue({
            data: {
                ...RESPUESTA,
                nodos: [...RESPUESTA.nodos, {
                    node: 'sin-nodo', status: 'ok', host: {}, peers: {},
                    containers: { total: 1, running: 1 },
                    servicios: [{ slug: 'sextante', label: 'sextante', status: 'ok', version: '2.8.0', uptime_24h: 100 }],
                }],
            },
        });
        montar();
        await waitFor(() => expect(
            screen.getByText('1 servicios sin nodo declarado'),
        ).toBeInTheDocument());
    });

    it('avisa si el monitor no responde', async () => {
        api.get.mockRejectedValue(new Error('502'));
        montar();
        await waitFor(() => expect(screen.getByText('El monitor no respondió')).toBeInTheDocument());
    });
});
