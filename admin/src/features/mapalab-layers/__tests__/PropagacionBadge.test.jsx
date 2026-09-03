import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PropagacionBadge from '@features/mapalab-layers/components/layersEditor/PropagacionBadge';

const updateLayer = vi.fn(() => Promise.resolve());
const reload = vi.fn(() => Promise.resolve());

const pinta = (props = {}) => render(
    <PropagacionBadge rawTree={ARBOL} groupId="g" updateLayer={updateLayer} reload={reload} {...props} />,
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
        expect(screen.getByText('Aplicar a las 1 que tienen la suya')).toBeInTheDocument();
    });

    it('aplicar borra la tarjetita propia y refresca el árbol', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        pinta();
        fireEvent.click(screen.getByText('2/3'));
        await waitFor(() => expect(screen.getByText('usar esta')).toBeInTheDocument());
        fireEvent.click(screen.getByText('usar esta'));
        await waitFor(() => expect(screen.getByText('Sí, aplicar')).toBeInTheDocument());
        fireEvent.click(screen.getByText('Sí, aplicar'));
        await waitFor(() => expect(updateLayer).toHaveBeenCalledWith('g.c', { infoboxConfig: null }));
        await waitFor(() => expect(reload).toHaveBeenCalled());
        await vi.advanceTimersByTimeAsync(6000);
        await waitFor(() => expect(reload).toHaveBeenCalledTimes(2));
        vi.useRealTimers();
    });

});
