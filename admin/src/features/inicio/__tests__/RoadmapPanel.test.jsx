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
    fila({ clave: 'legado-colibri', etiqueta: 'colibrí legado', proyecto: 'legado', tipo: 'legacy', fecha_eje: '2024-03-15' }),
    fila({ clave: 'colibri', etiqueta: 'colibrí', proyecto: 'colibri', tipo: 'joven', nace_de: 'legado-colibri', leyenda: 'lo releva', fecha_eje: '2026-05-07' }),
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

    it('los botones de zoom acercan y alejan el lienzo', async () => {
        montar();
        await screen.findByText('mariachi 2');
        expect(screen.getByText('100%')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Acercar el mapa' }));
        expect(screen.getByText('120%')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Alejar el mapa' }));
        expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('no deja alejar más allá del mínimo', async () => {
        montar();
        await screen.findByText('mariachi 2');
        const alejar = screen.getByRole('button', { name: 'Alejar el mapa' });
        [1, 2, 3].forEach(() => fireEvent.click(alejar));
        expect(screen.getByText('60%')).toBeInTheDocument();
        expect(alejar).toBeDisabled();
    });

    it('el botón detiene y reanuda el marcador', async () => {
        montar();
        fireEvent.click(await screen.findByRole('button', { name: /pausar/i }));
        const reanudar = screen.getByRole('button', { name: /reanudar/i });
        expect(reanudar).toBeInTheDocument();
        fireEvent.click(reanudar);
        expect(screen.getByRole('button', { name: /pausar/i })).toBeInTheDocument();
    });

    it('el detalle se mueve al hito que se toca y se cierra con la X', async () => {
        montar();
        fireEvent.click((await screen.findByText('mariachi 2')).closest('g'));
        expect(await screen.findByText(/la identidad se va a minerva/i)).toBeInTheDocument();

        fireEvent.click(screen.getByText('geoserver 1').closest('g'));
        expect(screen.getByText('geoserver 1', { selector: 'text' })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Cerrar el detalle' }));
        expect(screen.queryByRole('button', { name: 'Cerrar el detalle' })).not.toBeInTheDocument();
    });

    it('la conexión se apaga con el más escondido de sus dos nodos', async () => {
        const { container } = montar();
        await screen.findByText('mariachi 2');
        const leyendas = [...container.querySelectorAll('text')].filter((t) => t.textContent === 'lo releva');
        expect(leyendas).toHaveLength(1);

        fireEvent.click(screen.getByText('mariachi 2').closest('g'));

        const grupo = leyendas[0].closest('g');
        expect(Number(grupo.getAttribute('opacity'))).toBeLessThan(1);
    });

    it('resalta al sucesor de un hito que viene de otro', async () => {
        montar();
        const legado = (await screen.findByText('colibrí legado')).closest('g');
        fireEvent.click(legado);
        expect(screen.getByText('colibrí').closest('g')).not.toHaveAttribute('opacity', '0.18');
    });
});
