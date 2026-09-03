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
    fila({ clave: 'frames', etiqueta: 'frames', proyecto: 'frames', fecha_eje: '2026-08-10', nombre_anterior: 'frigate' }),
    fila({ clave: 'f-mcp', etiqueta: 'mapalab · MCP', proyecto: 'mapalab', tipo: 'feature', feature_de: 'mapalab', fecha_eje: '2026-07-30' }),
    fila({ clave: 'mapalab-1', etiqueta: 'mapalab 1', proyecto: 'mapalab', fecha_eje: '2026-03-27' }),
    fila({ clave: 'legado-colibri', etiqueta: 'colibrí legado', proyecto: 'legado', tipo: 'legacy', fecha_eje: '2024-03-15' }),
    fila({ clave: 'colibri', etiqueta: 'colibrí', proyecto: 'colibri', tipo: 'joven', nace_de: 'legado-colibri', leyenda: 'lo releva', fecha_eje: '2026-05-07' }),
];

const montar = () => render(
    <MemoryRouter><App><RoadmapPanel /></App></MemoryRouter>,
);

const CICLOS = [{
    clave: 'c-rojo', nombre: 'tamal-rojo', nota: 'lo nuevo', motivo: 'doce frentes',
    color: '#B3261E', x0: 1200, x1: 1492, y0: 46, y1: 400, orden: 0,
}];

const PROCESOS = [{
    clave: 'cuadernillos', etiqueta: 'cuadernillos', proyecto: 'cuadernillos',
    desde: '2026-03-23', cada: '03-23', fecha_texto: 'anual', motivo: 'un PDF por municipio',
    activo: true, orden: 0,
}];

beforeEach(() => {
    vi.clearAllMocks();
    usuario.permisos = [];
    api.get.mockImplementation((ruta) => {
        if (ruta.includes('ciclos')) return Promise.resolve({ data: CICLOS });
        if (ruta.includes('procesos')) return Promise.resolve({ data: PROCESOS });
        return Promise.resolve({ data: FILAS });
    });
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
        expect(screen.getByText('frames')).toBeInTheDocument();
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
        expect(await screen.findByRole('button', { name: /cambiar punto/i })).toBeInTheDocument();
    });

    it('las bandas de ciclo se pintan con un tinte de su color, no en negro', async () => {
        const { container } = montar();
        await screen.findByText('tamal-rojo');

        const fondo = [...container.querySelectorAll('rect')]
            .map((r) => r.getAttribute('fill'))
            .filter((f) => f && f.startsWith('rgba('));

        expect(fondo.length).toBeGreaterThan(0);
        fondo.forEach((f) => expect(f).not.toBe('rgba(0,0,0,1)'));
    });

    it('editar pide pantalla completa al entrar', async () => {
        usuario.permisos = ['mariachi.roadmap.manage'];
        const pedir = vi.fn(() => Promise.resolve());
        Element.prototype.requestFullscreen = pedir;
        montar();

        fireEvent.click(await screen.findByRole('button', { name: /editar/i }));

        await waitFor(() => expect(pedir).toHaveBeenCalled());
        delete Element.prototype.requestFullscreen;
    });

    it('un solo clic en edición abre el modal completo', async () => {
        usuario.permisos = ['mariachi.roadmap.manage'];
        montar();
        fireEvent.click(await screen.findByRole('button', { name: /editar/i }));
        fireEvent.click(screen.getByText('mariachi 2').closest('g'));

        expect(await screen.findByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Viene de')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument();
    });

    it('la vista previa del modal reacciona a lo que se escribe', async () => {
        usuario.permisos = ['mariachi.roadmap.manage'];
        montar();
        fireEvent.click(await screen.findByRole('button', { name: /editar/i }));
        fireEvent.click(screen.getByText('mariachi 2').closest('g'));
        const dialogo = await screen.findByRole('dialog');

        fireEvent.change(dialogo.querySelector('#txt'), { target: { value: 'mariachi 9' } });

        await waitFor(() => {
            const previa = dialogo.querySelector('svg[aria-label="Vista previa del hito"]');
            expect(previa.textContent).toContain('mariachi 9');
        });
    });

    it('cambiar punto abre su propio modal', async () => {
        usuario.permisos = ['mariachi.roadmap.manage'];
        montar();
        fireEvent.click(await screen.findByRole('button', { name: /editar/i }));
        fireEvent.click(await screen.findByRole('button', { name: /cambiar punto/i }));

        expect(await screen.findByText('Quién recorre la línea')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /administrar símbolos/i })).toBeInTheDocument();
    });

    it('el editor ofrece armar una sucesión con otro hito', async () => {
        usuario.permisos = ['mariachi.roadmap.manage'];
        montar();
        fireEvent.click(await screen.findByRole('button', { name: /editar/i }));
        fireEvent.click(screen.getByText('mariachi 2').closest('g'));

        expect(await screen.findByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Viene de')).toBeInTheDocument();
        expect(screen.getByText('Qué dice la conexión')).toBeInTheDocument();
        expect(screen.getByText('Orden en su día')).toBeInTheDocument();
    });

    it('ofrece agregar los tres tipos de elemento', async () => {
        usuario.permisos = ['mariachi.roadmap.manage'];
        montar();
        fireEvent.click(await screen.findByRole('button', { name: /editar/i }));

        expect(await screen.findByRole('button', { name: /agregar hito/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /agregar ciclo/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /agregar proceso/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /cambiar punto/i })).toBeInTheDocument();
    });

    it('edita un ciclo con sus propios campos', async () => {
        usuario.permisos = ['mariachi.roadmap.manage'];
        montar();
        fireEvent.click(await screen.findByRole('button', { name: /editar/i }));
        fireEvent.click(screen.getByText('tamal-rojo').closest('g'));

        expect(await screen.findByText(/Editando ciclo/)).toBeInTheDocument();
        expect(screen.getByText('Empieza en')).toBeInTheDocument();
        expect(screen.getByText('Termina en')).toBeInTheDocument();
    });

    it('crea un ciclo contra su propio endpoint', async () => {
        usuario.permisos = ['mariachi.roadmap.manage'];
        api.post.mockResolvedValue({ data: CICLOS[0] });
        montar();
        fireEvent.click(await screen.findByRole('button', { name: /editar/i }));
        fireEvent.click(await screen.findByRole('button', { name: /agregar ciclo/i }));

        await waitFor(() => expect(api.post).toHaveBeenCalledWith(
            '/roadmap/ciclos',
            expect.objectContaining({ nombre: 'ciclo nuevo' }),
        ));
    });

    it('el doble clic sobre el eje crea un hito en esa fecha', async () => {
        usuario.permisos = ['mariachi.roadmap.manage'];
        api.post.mockResolvedValue({ data: fila({ clave: 'nuevo', etiqueta: 'hito nuevo' }) });
        montar();
        fireEvent.click(await screen.findByRole('button', { name: /editar/i }));

        const svg = document.querySelector('svg[role="img"]');
        svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 2400, height: 860 });
        fireEvent.doubleClick(svg, { clientX: 1000, clientY: 400 });

        await waitFor(() => expect(api.post).toHaveBeenCalledWith(
            '/roadmap/hitos',
            expect.objectContaining({ fecha_eje: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }),
        ));
    });

    it('no crea nada con doble clic fuera de las zonas', async () => {
        usuario.permisos = ['mariachi.roadmap.manage'];
        montar();
        fireEvent.click(await screen.findByRole('button', { name: /editar/i }));

        const svg = document.querySelector('svg[role="img"]');
        svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 2400, height: 860 });
        fireEvent.doubleClick(svg, { clientX: 1000, clientY: 780 });

        expect(api.post).not.toHaveBeenCalled();
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

    it('el zoom no se ofrece fuera de la pantalla completa', async () => {
        montar();
        await screen.findByText('mariachi 2');
        expect(screen.queryByRole('button', { name: 'Acercar el mapa' })).not.toBeInTheDocument();
        expect(screen.queryByText('100%')).not.toBeInTheDocument();
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
