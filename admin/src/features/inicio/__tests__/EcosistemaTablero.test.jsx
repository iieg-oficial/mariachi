import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import EcosistemaTablero from '@features/inicio/components/EcosistemaTablero';

const tramos = {
    desde: '2026-08-20T22:46:00Z',
    hasta: '2026-08-21T22:46:00Z',
    resolucion_seg: 60,
    celdas: 1440,
    tramos: [
        { min: 0, dur: 1300, estado: 'ok', detalle: null },
        { min: 1300, dur: 140, estado: 'down', detalle: 'plugin_qgis · HTTP 404' },
    ],
};

const plataforma = (slug, capa, status, extra = {}) => ({
    slug,
    label: slug,
    capa,
    status,
    healthy: status === 'ok',
    version: '1.0.0',
    uptime24h: status === 'ok' ? 100 : 90.3,
    detail: null,
    sinceHuman: 'hace 2 h',
    containers: null,
    url: null,
    repo: `https://github.com/iieg-oficial/${slug}`,
    taiga: null,
    tramos,
    ...extra,
});

const montar = (plataformas, props = {}) => render(
    <MemoryRouter>
        <EcosistemaTablero plataformas={plataformas} loading={false} {...props} />
    </MemoryRouter>,
);

describe('EcosistemaTablero', () => {
    it('pone el contador de operativos en el titulo', () => {
        montar([
            plataforma('gateway-hub', 'entrada', 'down'),
            plataforma('acervo', 'datos', 'ok'),
            plataforma('mariachi', 'apps', 'ok'),
        ]);
        expect(screen.getByText('2 / 3')).toBeInTheDocument();
    });

    it('usa el mismo encabezado de seccion que el resto del inicio', () => {
        montar([plataforma('acervo', 'datos', 'ok')]);
        expect(screen.getByText('Huachicol')).toBeInTheDocument();
        expect(screen.getByText('— Estatus de ecosistema')).toBeInTheDocument();
        expect(screen.getByText('Ver observabilidad →')).toBeInTheDocument();
    });

    it('agrupa por capa y cuenta cada grupo', () => {
        montar([
            plataforma('gateway-hub', 'entrada', 'down'),
            plataforma('acervo', 'datos', 'ok'),
            plataforma('sextante', 'datos', 'ok'),
        ]);
        expect(screen.getByText('Entrada')).toBeInTheDocument();
        expect(screen.getByText('Datos')).toBeInTheDocument();
        expect(screen.getByText('0/1')).toBeInTheDocument();
        expect(screen.getByText('2/2')).toBeInTheDocument();
    });

    it('no dibuja capas vacias', () => {
        montar([plataforma('acervo', 'datos', 'ok')]);
        expect(screen.queryByText('Aplicaciones')).not.toBeInTheDocument();
    });

    it('muestra la version junto al nombre del servicio', () => {
        montar([plataforma('acervo', 'datos', 'ok', { version: '2.1.2' })]);
        expect(screen.getByText('v2.1.2')).toBeInTheDocument();
    });

    it('escribe el motivo cuando el servicio no esta operativo', () => {
        montar([plataforma('gateway-hub', 'entrada', 'down', { detail: 'plugin_qgis · HTTP 404' })]);
        expect(screen.getByText('plugin_qgis · HTTP 404')).toBeInTheDocument();
    });

    it('no escribe motivo en un servicio sano', () => {
        montar([plataforma('acervo', 'datos', 'ok', { detail: 'todo bien' })]);
        expect(screen.queryByText('todo bien')).not.toBeInTheDocument();
    });

    it('avisa cuando el monitor no reporto servicios', () => {
        montar([]);
        expect(screen.getByText('El monitor no reportó servicios')).toBeInTheDocument();
    });

    it('rotula la barra para lectores de pantalla', () => {
        montar([plataforma('acervo', 'datos', 'ok')]);
        expect(screen.getByLabelText('Disponibilidad de las últimas 24 horas')).toBeInTheDocument();
    });
});
