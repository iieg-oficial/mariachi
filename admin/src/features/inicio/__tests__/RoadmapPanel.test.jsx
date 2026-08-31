import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { App } from 'antd';

vi.mock('@shared/services/api', () => ({
    default: { get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const usuario = { permisos: [] };
vi.mock('@shared/contexts/useAuth', () => ({
    useAuth: () => ({ user: { permissions: usuario.permisos } }),
}));

import api from '@shared/services/api';
import RoadmapPanel from '@features/inicio/components/RoadmapPanel';
import { acomodar, anchoDe } from '@features/inicio/helpers/roadmapLayout';

const fila = (extra) => ({
    clave: 'x', etiqueta: 'x', proyecto: 'mariachi', tipo: 'mayor',
    fecha_eje: '2026-01-01', fecha_texto: '1 ene 2026', motivo: 'motivo',
    nombre_anterior: null, feature_de: null, nace_de: null, leyenda: null,
    beta: false, muerto: false, ...extra,
});

const FILAS = [
    fila({ clave: 'mariachi-2', etiqueta: 'mariachi 2', fecha_eje: '2026-08-10', motivo: 'la identidad se va a minerva' }),
    fila({ clave: 'geoserver-1', etiqueta: 'geoserver 1', proyecto: 'sextante', fecha_eje: '2026-02-25' }),
    fila({ clave: 'wacha', etiqueta: 'wacha', proyecto: 'wacha', fecha_eje: '2026-08-10', nombre_anterior: 'frigate' }),
    fila({ clave: 'f-mcp', etiqueta: 'mapalab · MCP', proyecto: 'mapalab', tipo: 'feature', feature_de: 'mapalab', fecha_eje: '2026-07-30' }),
    fila({ clave: 'mapalab-1', etiqueta: 'mapalab 1', proyecto: 'mapalab', fecha_eje: '2026-03-27' }),
];

const montar = () => render(
    <MemoryRouter><App><RoadmapPanel /></App></MemoryRouter>,
);

beforeEach(() => {
    usuario.permisos = [];
    api.get.mockResolvedValue({ data: FILAS });
});

describe('acomodar', () => {
    it('nunca encima dos etiquetas del mismo nivel', () => {
        const hitos = FILAS.map((f) => ({
            id: f.clave, txt: f.etiqueta, proy: f.proyecto, tipo: f.tipo, f: f.fecha_eje,
        }));
        const porNivel = {};
        acomodar(hitos).forEach((h) => {
            const previo = porNivel[h.ly];
            if (previo) expect(h.lx - anchoDe(h) / 2).toBeGreaterThan(previo);
            porNivel[h.ly] = h.lx + anchoDe(h) / 2;
        });
    });
});

describe('RoadmapPanel', () => {
    it('encabeza la sección con el título en español', async () => {
        montar();
        expect(await screen.findByText('Hoja de ruta')).toBeInTheDocument();
    });

    it('dibuja los hitos que entrega la API', async () => {
        montar();
        expect(await screen.findByText('mariachi 2')).toBeInTheDocument();
        expect(screen.getByText('geoserver 1')).toBeInTheDocument();
    });

    it('conserva el nombre viejo cuando el proyecto se renombró', async () => {
        montar();
        expect(await screen.findByText('frigate')).toBeInTheDocument();
        expect(screen.getByText('wacha')).toBeInTheDocument();
    });

    it('abre el motivo al pasar por un hito', async () => {
        montar();
        const nodo = await screen.findByText('mariachi 2');
        fireEvent.mouseEnter(nodo.closest('g'));
        expect(await screen.findByText(/la identidad se va a minerva/i)).toBeInTheDocument();
    });

    it('esconde el botón de editar sin el permiso', async () => {
        montar();
        await screen.findByText('mariachi 2');
        expect(screen.queryByRole('button', { name: /editar/i })).not.toBeInTheDocument();
    });

    it('muestra el editor a quien tiene el permiso', async () => {
        usuario.permisos = ['mariachi.roadmap.manage'];
        montar();
        fireEvent.click(await screen.findByRole('button', { name: /editar/i }));
        expect(await screen.findByText('Quién recorre la línea')).toBeInTheDocument();
    });

    it('guarda un hito editado contra la API', async () => {
        usuario.permisos = ['mariachi.roadmap.manage'];
        api.put.mockResolvedValue({ data: fila({ clave: 'mariachi-2', etiqueta: 'mariachi 3', fecha_eje: '2026-08-10' }) });
        montar();
        fireEvent.click(await screen.findByRole('button', { name: /editar/i }));
        fireEvent.click(screen.getByText('mariachi 2').closest('g'));
        fireEvent.click(await screen.findByRole('button', { name: 'Guardar' }));
        await waitFor(() => expect(api.put).toHaveBeenCalledWith('/roadmap/hitos/mariachi-2', expect.objectContaining({ etiqueta: 'mariachi 2' })));
    });

    it('el botón de ver todos revela los features escondidos', async () => {
        montar();
        const feature = (await screen.findByText('MCP')).closest('g');
        expect(feature).toHaveAttribute('opacity', '0');

        fireEvent.click(screen.getByRole('button', { name: /ver todos/i }));

        expect(feature).not.toHaveAttribute('opacity', '0');
        expect(screen.getByRole('button', { name: /ocultar features/i })).toBeInTheDocument();
    });

    it('pinta el logo de los proyectos que tienen uno', async () => {
        const { container } = montar();
        await screen.findByText('mariachi 2');
        const logos = container.querySelectorAll('image');
        expect(logos.length).toBeGreaterThan(0);
    });

    it('el botón de seguimiento cambia a scroll libre', async () => {
        montar();
        fireEvent.click(await screen.findByRole('button', { name: 'Siguiendo' }));
        expect(screen.getByRole('button', { name: 'Scroll libre' })).toBeInTheDocument();
    });
});
