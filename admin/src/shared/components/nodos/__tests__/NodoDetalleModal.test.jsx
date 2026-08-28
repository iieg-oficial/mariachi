import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import NodoDetalleModal from '@shared/components/nodos/NodoDetalleModal';

const tramos = {
    desde: '2026-08-26T22:00:00Z',
    hasta: '2026-08-27T22:00:00Z',
    resolucion_seg: 60,
    celdas: 1440,
    tramos: [{ min: 0, dur: 1440, estado: 'ok', detalle: null }],
};

const NODO = {
    node: 'S1',
    status: 'ok',
    rol: 'gateway · acervo · mariachi · huachicol',
    hostname: 'gateway',
    servicios: [
        { slug: 'mariachi', label: 'mariachi', status: 'ok', version: '2.25.1', uptime_24h: 100, uptime_tramos: tramos },
        { slug: 'acervo', label: 'acervo', status: 'ok', version: '2.2.0', uptime_24h: 99.1, uptime_tramos: tramos },
    ],
    host: {
        cores: 8, load_1m: 1.24, load_5m: 0.98, load_15m: 0.71,
        memory_used_percent: 41.2, memory_used_gb: 6.2, memory_total_gb: 15,
        swap_used_percent: 0, swap_used_gb: 0, uptime_seconds: 1900800,
        disk_used_percent: 40, disk_free_gb: 300,
    },
    containers: { total: 11, running: 11 },
    contenedores: [
        { name: 'mariachi-api', state: 'running', health: 'healthy' },
        { name: 'acervo-init', state: 'exited', health: null },
    ],
};

const montar = (nodo = NODO, aristas = []) => render(
    <MemoryRouter>
        <NodoDetalleModal nodo={nodo} aristas={aristas} open onClose={() => {}} />
    </MemoryRouter>,
);

describe('NodoDetalleModal', () => {
    it('encabeza con el identificador y el hostname real del servidor', () => {
        const { baseElement } = montar();
        expect(screen.getByText('S1')).toBeInTheDocument();
        expect(screen.getByText('gateway')).toBeInTheDocument();
        expect(baseElement.querySelector('.ant-badge-status-success')).toBeTruthy();
    });

    it('muestra el disco, que antes faltaba', () => {
        montar();
        expect(screen.getByText('200 / 500 GB')).toBeInTheDocument();
    });

    it('resume el sistema del host en una linea', () => {
        montar({ ...NODO, host: { ...NODO.host, ip: '10.0.0.2', os: 'Ubuntu 24.04 LTS', kernel: '6.8.0-51' } });
        expect(screen.getByText(/10\.0\.0\.2 · Ubuntu 24\.04 LTS · kernel 6\.8\.0-51/)).toBeInTheDocument();
    });

    it('lista los puertos y cuantos responden', () => {
        montar({
            ...NODO,
            puertos: [
                { nombre: 'mapalab', puerto: 80, status: 'ok', servicio: 'gateway-hub' },
                { nombre: 'sextante', puerto: 8080, status: 'down', servicio: 'gateway-hub' },
            ],
        });
        expect(screen.getByText('Puertos · 1 de 2 abiertos')).toBeInTheDocument();
        expect(screen.getByText('mapalab :80')).toBeInTheDocument();
        expect(screen.getByText('sextante :8080')).toBeInTheDocument();
    });

    it('reutiliza la fila de servicios, con su barra de 24 horas', () => {
        montar();
        expect(screen.getByText('Servicios · 2')).toBeInTheDocument();
        expect(screen.getAllByLabelText('Disponibilidad de las últimas 24 horas')).toHaveLength(2);
        expect(screen.getByText('v2.25.1')).toBeInTheDocument();
    });

    it('lista los contenedores del nodo, no solo el conteo', () => {
        montar();
        expect(screen.getByText('Contenedores · 11 de 11')).toBeInTheDocument();
        expect(screen.getByText('mariachi-api')).toBeInTheDocument();
        expect(screen.getByText('acervo-init')).toBeInTheDocument();
    });

    it('cada medidor se pinta con el porcentaje que le toca', () => {
        const { baseElement } = montar();
        const anchos = Array.from(baseElement.querySelectorAll('.ant-progress-track'))
            .map((barra) => barra.style.width);
        expect(anchos).toEqual(['15%', '41.2%', '0%', '40%']);
    });

    it('la carga se resume junto a los núcleos', () => {
        montar();
        expect(screen.getByText('1.24 · 8c')).toBeInTheDocument();
    });

    it('sin reportero lo dice en vez de enseñar ceros', () => {
        montar({ ...NODO, host: {} });
        expect(screen.getByText('Este nodo no tiene reportero de host')).toBeInTheDocument();
    });

    it('los enlaces del nodo salen con su latencia', () => {
        montar(NODO, [{ de: 'S1', a: 'S4', ms: 6, estado: 'ok' }]);
        expect(screen.getByText('→ S4 · 6 ms')).toBeInTheDocument();
    });
});
