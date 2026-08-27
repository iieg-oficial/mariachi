import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@shared/services/api', () => ({
    default: { get: vi.fn() },
}));

import api from '@shared/services/api';
import { getNodos, aristasDe } from '@shared/services/nodosService';

const nodo = (node, extra = {}) => ({
    node,
    status: 'ok',
    servicios: [{ slug: 'x', label: 'x', status: 'ok', version: '1.0.0', uptime_24h: 100 }],
    host: {},
    peers: {},
    containers: { total: 2, running: 2 },
    ...extra,
});

describe('aristasDe', () => {
    it('arma una arista por cada peer con latencia', () => {
        const aristas = aristasDe([
            nodo('S1', { peers: { S4: { status: 'ok', latency_ms: 6 } } }),
            nodo('S4'),
        ]);
        expect(aristas).toEqual([{ de: 'S1', a: 'S4', ms: 6, estado: 'ok', detalle: null }]);
    });

    it('ignora un peer que no esta en el mapa para no dibujar al vacio', () => {
        const aristas = aristasDe([nodo('S1', { peers: { S9: { status: 'ok', latency_ms: 4 } } })]);
        expect(aristas).toEqual([]);
    });

    it('un peer que no responde queda como arista caida', () => {
        const aristas = aristasDe([
            nodo('S1', { peers: { S2: { status: 'down', detail: 'timed out' } } }),
            nodo('S2'),
        ]);
        expect(aristas[0].estado).toBe('down');
        expect(aristas[0].detalle).toBe('timed out');
    });
});

describe('getNodos', () => {
    beforeEach(() => api.get.mockReset());

    it('coloca cada nodo conocido en su posicion del mapa', async () => {
        api.get.mockResolvedValue({ data: { environment: 'produccion', nodos: [nodo('S1'), nodo('S4')] } });
        const { nodos } = await getNodos();
        expect(nodos[0].x).toBe(80);
        expect(nodos[1].aislado).toBe(true);
    });

    it('un nodo desconocido igual recibe posicion para no romper el mapa', async () => {
        api.get.mockResolvedValue({ data: { nodos: [nodo('S7')] } });
        const { nodos } = await getNodos();
        expect(typeof nodos[0].x).toBe('number');
        expect(typeof nodos[0].y).toBe('number');
    });

    it('marca la VM de vine y wacha como exclusiva de proxmox', async () => {
        api.get.mockResolvedValue({ data: { nodos: [nodo('pmx-vine-wacha')] } });
        const { nodos } = await getNodos();
        expect(nodos[0].soloProxmox).toBe(true);
        expect(nodos[0].rol).toContain('vine');
    });

    it('arrastra el ambiente y los eventos tal cual llegan', async () => {
        api.get.mockResolvedValue({
            data: { environment: 'proxmox', nodos: [], eventos: [{ slug: 'vine', to_status: 'ok' }] },
        });
        const datos = await getNodos();
        expect(datos.environment).toBe('proxmox');
        expect(datos.eventos).toHaveLength(1);
    });
});

describe('aristas de un nodo real', () => {
    beforeEach(() => api.get.mockReset());

    it('deriva una arista por cada peer del reportero', async () => {
        api.get.mockResolvedValue({
            data: {
                nodos: [
                    {
                        node: 'S1', status: 'ok', servicios: [], host: {},
                        containers: { total: 1, running: 1 },
                        peers: {
                            S2: { status: 'ok', latency_ms: 18 },
                            S4: { status: 'down', detail: 'timed out' },
                        },
                    },
                    { node: 'S2', status: 'ok', servicios: [], host: {}, peers: {}, containers: { total: 1, running: 1 } },
                    { node: 'S4', status: 'ok', servicios: [], host: {}, peers: {}, containers: { total: 1, running: 1 } },
                ],
            },
        });
        const { aristas } = await getNodos();
        expect(aristas).toHaveLength(2);
        expect(aristas.find((a) => a.a === 'S2').ms).toBe(18);
        expect(aristas.find((a) => a.a === 'S4').estado).toBe('down');
    });
});
