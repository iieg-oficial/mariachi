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
        expect(aristas).toEqual([
            { de: 'S1', a: 'S4', ms: 6, puerto: null, estado: 'ok', detalle: null },
        ]);
    });

    it('ignora un peer que no esta en el mapa para no dibujar al vacio', () => {
        const aristas = aristasDe([nodo('S1', { peers: { S9: { status: 'ok', latency_ms: 4 } } })]);
        expect(aristas).toEqual([]);
    });

    it('la arista lleva el puerto por el que se midio', () => {
        const aristas = aristasDe([
            nodo('S1', { peers: { S4: { status: 'ok', latency_ms: 6, port: 6432 } } }),
            nodo('S4'),
        ]);
        expect(aristas[0].puerto).toBe(6432);
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
        const porId = Object.fromEntries(nodos.map((n) => [n.node, n]));
        expect(porId.S1.x).toBe(80);
        expect(porId.S4.aislado).toBe(true);
    });

    it('agrega el nodo de Internet delante de la entrada publica', async () => {
        api.get.mockResolvedValue({ data: { environment: 'produccion', nodos: [nodo('S1')] } });
        const { nodos, aristas } = await getNodos();
        expect(nodos[0].node).toBe('internet');
        expect(aristas[0]).toMatchObject({ de: 'internet', a: 'S1', publica: true });
    });

    it('sin entrada publica no inventa el nodo de Internet', async () => {
        api.get.mockResolvedValue({ data: { environment: 'proxmox', nodos: [nodo('pmx-vine-frames')] } });
        const { nodos } = await getNodos();
        expect(nodos.some((n) => n.node === 'internet')).toBe(false);
    });

    it('un nodo desconocido igual recibe posicion para no romper el mapa', async () => {
        api.get.mockResolvedValue({ data: { nodos: [nodo('S7')] } });
        const { nodos } = await getNodos();
        expect(typeof nodos[0].x).toBe('number');
        expect(typeof nodos[0].y).toBe('number');
    });

    it('el nodo de Internet lleva sus puertos publicos', async () => {
        api.get.mockResolvedValue({ data: { nodos: [nodo('S1')] } });
        const { nodos } = await getNodos();
        expect(nodos[0].puertos.map((p) => p.puerto)).toEqual([80, 443]);
    });

    it('marca la VM de vine y frames como exclusiva de proxmox', async () => {
        api.get.mockResolvedValue({ data: { nodos: [nodo('pmx-vine-frames')] } });
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
        expect(aristas.filter((a) => !a.publica)).toHaveLength(2);
        expect(aristas.find((a) => a.a === 'S2').ms).toBe(18);
        expect(aristas.find((a) => a.a === 'S4').estado).toBe('down');
    });
});

describe('hostname del nodo', () => {
    beforeEach(() => api.get.mockReset());

    it('usa el nombre real del servidor en produccion', async () => {
        api.get.mockResolvedValue({ data: { environment: 'produccion', nodos: [nodo('S1')] } });
        const { nodos } = await getNodos();
        expect(nodos.find((n) => n.node === 'S1').hostname).toBe('gateway');
    });

    it('antepone el prefijo del espejo en proxmox', async () => {
        api.get.mockResolvedValue({ data: { environment: 'proxmox', nodos: [nodo('S4')] } });
        const { nodos } = await getNodos();
        expect(nodos.find((n) => n.node === 'S4').hostname).toBe('pmx-dataengine');
    });

    it('no duplica el prefijo en un nodo que ya lo trae', async () => {
        api.get.mockResolvedValue({ data: { environment: 'proxmox', nodos: [nodo('pmx-vine-frames')] } });
        const { nodos } = await getNodos();
        expect(nodos[0].hostname).toBe('pmx-vine-frames');
    });

    it('un nodo desconocido se queda sin hostname en vez de inventarlo', async () => {
        api.get.mockResolvedValue({ data: { environment: 'produccion', nodos: [nodo('S9')] } });
        const { nodos } = await getNodos();
        expect(nodos.find((n) => n.node === 'S9').hostname).toBeNull();
    });
});
