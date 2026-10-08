import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PropagacionBadge from '@features/mapalab-layers/components/layersEditor/PropagacionBadge';

const updateLayer = vi.fn(() => Promise.resolve());
const reload = vi.fn(() => Promise.resolve());

const TARJETA = { headerField: 'nombre' };
const CONFIG_GRUPO = { headerField: 'nombre' };

const ARBOL = [{
    id: 'g', label: 'Unidades', nodeType: 'group', littleCard: TARJETA,
    children: [
        { id: 'g.a', label: 'Primer nivel', nodeType: 'leaf', littleCard: TARJETA, inheritedFrom: 'g' },
        { id: 'g.b', label: 'Segundo nivel', nodeType: 'leaf', littleCard: TARJETA, inheritedFrom: 'g' },
        { id: 'g.c', label: 'Hospitales', nodeType: 'leaf', littleCard: { headerField: 'otro' } },
    ],
}];

const TODAS_HEREDAN = [{ ...ARBOL[0], children: ARBOL[0].children.filter((c) => c.inheritedFrom) }];

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

const abrirMenu = async (contador) => {
    fireEvent.click(screen.getByText(contador));
    await waitFor(() => expect(screen.getByText('Primer nivel')).toBeInTheDocument());
};

const abrirAyuda = async () => {
    fireEvent.click(screen.getByLabelText('Cómo funciona la tarjetita del grupo'));
    await waitFor(() => expect(screen.getByText('Tarjetita del grupo')).toBeInTheDocument());
};

beforeEach(() => { updateLayer.mockClear(); reload.mockClear(); });

describe('PropagacionBadge', () => {
    it('el badge es solo el contador', () => {
        pinta();
        expect(screen.getByText('2/3')).toBeInTheDocument();
        expect(screen.getByLabelText('Propagación: 2 de 3 propiedades')).toBeInTheDocument();
        expect(screen.queryByText(/propiedades usan esta tarjetita/)).not.toBeInTheDocument();
    });

    it('no aparece en un nodo que no es grupo', () => {
        const { container } = pinta({ groupId: 'g.a' });
        expect(container).toBeEmptyDOMElement();
    });

    it('lista quién la usa y quién tiene la suya', async () => {
        pinta();
        await abrirMenu('2/3');
        expect(screen.getAllByText('usa la del grupo')).toHaveLength(2);
        expect(screen.getByText('tiene la suya')).toBeInTheDocument();
        expect(screen.getByText(/Que todas usen la del grupo/)).toBeInTheDocument();
    });

    it('cuando todas ya la usan lo dice como logro, no como bloqueo', async () => {
        pinta({ rawTree: TODAS_HEREDAN });
        fireEvent.click(screen.getByText('2/2'));
        await waitFor(() => expect(screen.getByText('Ya todas usan la del grupo')).toBeInTheDocument());
        expect(screen.queryByText(/Que todas usen la del grupo/)).not.toBeInTheDocument();
    });

    it('aplicar guarda el grupo, borra la propia y refresca dos veces', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        pinta();
        await abrirMenu('2/3');
        fireEvent.click(screen.getByText('usar esta'));
        await waitFor(() => expect(screen.getByText('Sí, aplicar')).toBeInTheDocument());
        fireEvent.click(screen.getByText('Sí, aplicar'));
        await waitFor(() => expect(updateLayer).toHaveBeenCalledWith('g', { infoboxConfig: CONFIG_GRUPO }));
        await waitFor(() => expect(updateLayer).toHaveBeenCalledWith('g.c', { infoboxConfig: null }));
        await vi.advanceTimersByTimeAsync(6000);
        await waitFor(() => expect(reload).toHaveBeenCalledTimes(2));
        vi.useRealTimers();
    });
});

describe('PropagacionBadge · la explicación vive en el ícono de información', () => {
    it('explica qué es la propagación', async () => {
        pinta();
        await abrirAyuda();
        expect(screen.getByText(/muestran/)).toBeInTheDocument();
    });

    it('cuando todas la usan lo dice ahí', async () => {
        pinta({ rawTree: TODAS_HEREDAN });
        await abrirAyuda();
        expect(screen.getByText(/no hay nada que propagar/)).toBeInTheDocument();
    });

    it('sin permiso de publicar lo dice ahí', async () => {
        pinta({ puedePublicar: false });
        await abrirAyuda();
        expect(screen.getByText(/Solo quien publica/)).toBeInTheDocument();
    });
});
