import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@shared/services/api', () => ({
    default: { get: vi.fn() },
}));

import api from '@shared/services/api';
import { getPlataformas, CAPAS } from '@features/inicio/api/inicioService';

const servicio = (slug, extra = {}) => ({
    slug,
    label: slug,
    status: 'ok',
    healthy: true,
    version: '1.0.0',
    uptime_24h: 100,
    uptime_tramos: { desde: '2026-08-21T00:00:00Z', celdas: 1440, tramos: [] },
    ...extra,
});

describe('getPlataformas', () => {
    beforeEach(() => {
        api.get.mockReset();
    });

    it('toma la lista del monitor y no de un catalogo fijo', async () => {
        api.get.mockResolvedValue({ data: { services: [servicio('vine'), servicio('wacha')] } });
        const plataformas = await getPlataformas();
        expect(plataformas.map((p) => p.slug)).toEqual(['vine', 'wacha']);
    });

    it('reconoce sextante, que antes se pedia como geoserver', async () => {
        api.get.mockResolvedValue({ data: { services: [servicio('sextante')] } });
        const [sextante] = await getPlataformas();
        expect(sextante.label).toBe('Sextante');
        expect(sextante.capa).toBe('datos');
        expect(sextante.repo).toContain('sextante');
    });

    it('el portalito entra en la capa de entrada con su nombre corto', async () => {
        api.get.mockResolvedValue({ data: { services: [servicio('sitio2026')] } });
        const [portalito] = await getPlataformas();
        expect(portalito.label).toBe('Portalito');
        expect(portalito.capa).toBe('entrada');
    });

    it('un servicio desconocido cae en la capa sin clasificar y conserva su nombre', async () => {
        api.get.mockResolvedValue({ data: { services: [servicio('nuevo-servicio')] } });
        const [nuevo] = await getPlataformas();
        expect(nuevo.capa).toBe('otros');
        expect(nuevo.label).toBe('nuevo-servicio');
    });

    it('ordena por capa del ecosistema y alfabeticamente dentro de cada una', async () => {
        api.get.mockResolvedValue({
            data: {
                services: [
                    servicio('sieej'),
                    servicio('vine'),
                    servicio('gateway-hub'),
                    servicio('mapalab'),
                    servicio('acervo'),
                ],
            },
        });
        const plataformas = await getPlataformas();
        expect(plataformas.map((p) => p.slug)).toEqual([
            'gateway-hub', 'acervo', 'mapalab', 'sieej', 'vine',
        ]);
    });

    it('arrastra los tramos de disponibilidad tal cual llegan', async () => {
        api.get.mockResolvedValue({ data: { services: [servicio('acervo')] } });
        const [acervo] = await getPlataformas();
        expect(acervo.tramos.celdas).toBe(1440);
    });

    it('toda capa del catalogo tiene nombre y nota', () => {
        CAPAS.forEach((capa) => {
            expect(capa.nombre).toBeTruthy();
            expect(capa.nota).toBeTruthy();
        });
    });
});
