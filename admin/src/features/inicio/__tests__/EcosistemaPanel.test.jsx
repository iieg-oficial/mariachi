import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

vi.mock('@shared/services/api', () => ({
    default: { get: vi.fn() },
}));

import api from '@shared/services/api';
import EcosistemaPanel from '@features/inicio/components/EcosistemaPanel';

const NODOS = {
    environment: 'produccion',
    nodos: [
        {
            node: 'S1',
            status: 'ok',
            servicios: [{ slug: 'mariachi', label: 'mariachi', status: 'ok', version: '2.22.0', uptime_24h: 100 }],
            host: { cores: 8, load_1m: 1.2, memory_used_percent: 41 },
            peers: {},
            containers: { total: 5, running: 5 },
        },
    ],
    eventos: [],
};

const plataforma = (slug, status) => ({
    slug,
    label: slug,
    capa: 'apps',
    status,
    healthy: status === 'ok',
    version: '1.0.0',
    uptime24h: 100,
    detail: null,
    sinceHuman: null,
    containers: null,
    url: null,
    repo: null,
    taiga: null,
    tramos: null,
});

const montar = (plataformas) => render(
    <MemoryRouter>
        <EcosistemaPanel plataformas={plataformas} loading={false} />
    </MemoryRouter>,
);

describe('EcosistemaPanel', () => {
    beforeEach(() => {
        api.get.mockReset();
        api.get.mockResolvedValue({ data: NODOS });
    });

    it('abre en la vista de servidores', async () => {
        montar([plataforma('mariachi', 'ok')]);
        await waitFor(() => expect(screen.getByText('S1')).toBeInTheDocument());
        expect(screen.getByText('Click en un nodo para su detalle')).toBeInTheDocument();
    });

    it('el contador de operativos va junto a la leyenda', async () => {
        montar([plataforma('mariachi', 'ok'), plataforma('acervo', 'down')]);
        await waitFor(() => expect(screen.getByText('1 / 2 operativos')).toBeInTheDocument());
    });

    it('el segmento cambia a la vista de servicios', async () => {
        montar([plataforma('mariachi', 'ok')]);
        await waitFor(() => expect(screen.getByText('S1')).toBeInTheDocument());
        fireEvent.click(screen.getByText('Servicios'));
        await waitFor(() => expect(screen.getByText('Aplicaciones')).toBeInTheDocument());
        expect(screen.queryByText('S1')).not.toBeInTheDocument();
    });

    it('cada vista enlaza a su propia pagina', async () => {
        montar([plataforma('mariachi', 'ok')]);
        await waitFor(() => expect(screen.getByText('Ver servidores →')).toBeInTheDocument());
        fireEvent.click(screen.getByText('Servicios'));
        await waitFor(() => expect(screen.getByText('Ver observabilidad →')).toBeInTheDocument());
    });
});
