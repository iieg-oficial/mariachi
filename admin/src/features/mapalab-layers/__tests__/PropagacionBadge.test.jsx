import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PropagacionBadge from '@features/mapalab-layers/components/layersEditor/PropagacionBadge';

const updateLayer = vi.fn(() => Promise.resolve());
const reload = vi.fn(() => Promise.resolve());

const CONFIG_GRUPO = { headerField: 'nombre' };

const pinta = (props = {}) => render(
    <PropagacionBadge
        rawTree={ARBOL}
        groupId="g"
        updateLayer={updateLayer}
        reload={reload}
        configDelGrupo={CONFIG_GRUPO}
        puedePublicar
        {...props}
    />,
);

const TARJETA = { headerField: 'nombre' };

const ARBOL = [{
    id: 'g', label: 'Unidades', nodeType: 'group', littleCard: TARJETA,
    children: [
        { id: 'g.a', label: 'Primer nivel', nodeType: 'leaf', littleCard: TARJETA, inheritedFrom: 'g' },
        { id: 'g.b', label: 'Segundo nivel', nodeType: 'leaf', littleCard: TARJETA, inheritedFrom: 'g' },
        { id: 'g.c', label: 'Hospitales', nodeType: 'leaf', littleCard: { headerField: 'otro' } },
    ],
}];

beforeEach(() => { updateLayer.mockClear(); reload.mockClear(); });

describe('PropagacionBadge', () => {
    it('muestra cuántas propiedades usan la tarjetita', () => {
        pinta();
        expect(screen.getByLabelText('Propagación: 2 de 3 propiedades')).toBeInTheDocument();
        expect(screen.getByText('2/3')).toBeInTheDocument();
    });

    it('no aparece en un nodo que no es grupo', () => {
        const { container } = pinta({ groupId: 'g.a' });
        expect(container).toBeEmptyDOMElement();
    });

    it('lista quién la usa y quién tiene la suya', async () => {
        pinta();
        fireEvent.click(screen.getByText('2/3'));
        await waitFor(() => expect(screen.getByText('Hospitales')).toBeInTheDocument());
        expect(screen.getAllByText('usa la del grupo')).toHaveLength(2);
        expect(screen.getByText('tiene la suya')).toBeInTheDocument();
        expect(screen.getByText(/Que todas usen la del grupo/)).toBeInTheDocument();
    });

    it('aplicar borra la tarjetita propia y refresca el árbol', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        pinta();
        fireEvent.click(screen.getByText('2/3'));
        await waitFor(() => expect(screen.getByText('usar esta')).toBeInTheDocument());
        fireEvent.click(screen.getByText('usar esta'));
        await waitFor(() => expect(screen.getByText('Sí, aplicar')).toBeInTheDocument());
        fireEvent.click(screen.getByText('Sí, aplicar'));
        await waitFor(() => expect(updateLayer).toHaveBeenCalledWith('g', { infoboxConfig: CONFIG_GRUPO }));
        await waitFor(() => expect(updateLayer).toHaveBeenCalledWith('g.c', { infoboxConfig: null }));
        await waitFor(() => expect(reload).toHaveBeenCalled());
        await vi.advanceTimersByTimeAsync(6000);
        await waitFor(() => expect(reload).toHaveBeenCalledTimes(2));
        vi.useRealTimers();
    });

});

describe('PropagacionBadge · cuándo no se puede propagar', () => {
    it('sin permiso de publicar la acción queda deshabilitada y dice por qué', async () => {
        pinta({ puedePublicar: false });
        fireEvent.click(screen.getByText('2/3'));
        await waitFor(() => expect(screen.getByText(/Solo quien publica/)).toBeInTheDocument());
    });

    it('sin tarjetita en el grupo lo dice', async () => {
        pinta({ configDelGrupo: null });
        fireEvent.click(screen.getByText('2/3'));
        await waitFor(() => expect(screen.getByText(/todavía no tiene tarjetita/)).toBeInTheDocument());
    });

    it('cuando todas ya la usan, la acción sigue visible pero explicada', async () => {
        const todasHeredan = [{
            ...ARBOL[0],
            children: ARBOL[0].children.filter((c) => c.inheritedFrom),
        }];
        pinta({ rawTree: todasHeredan });
        fireEvent.click(screen.getByText('2/2'));
        await waitFor(() => expect(screen.getByText(/Que todas usen la del grupo/)).toBeInTheDocument());
        expect(screen.getByText(/ya usan la del grupo/)).toBeInTheDocument();
    });
});
