import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import FieldsList from '../FieldsList';

vi.mock('@features/acervo/hooks/useAccessibleBuckets', () => ({
    default: () => ({ buckets: [], loading: false }),
}));

vi.mock('../../../hooks/useCatalogos', () => ({
    default: () => ({ catalogos: {}, loading: false }),
}));

vi.mock('../../../hooks/useSearchParamState', () => ({
    default: (_key, initial) => [initial, vi.fn()],
}));

vi.mock('@shared/hooks/useIsMobile', () => ({
    default: () => ({ isMobile: false }),
}));

vi.mock('@shared/services/message', () => ({
    message: { info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

const step = {
    id: 'datos',
    type: 'form',
    fields: [
        { name: 'a', label: 'Campo A', type: 'text', layout: { colSpan: 2, col: 1, newRow: true } },
        { name: 'b', label: 'Campo B', type: 'text', layout: { colSpan: 2, col: 1, newRow: true } },
    ],
};

const bloqueNuevo = () => screen.getByText('Nuevo campo').closest('.ant-card');

const rejilla = (nodo) => nodo.closest('div[style*="display: grid"]');

const posicionEnRejilla = (nodo) => {
    const grid = rejilla(nodo);
    const celda = [ ...grid.children ].find((hijo) => hijo.contains(nodo));
    return [ ...grid.children ].indexOf(celda);
};

describe('FieldsList · formulario de campo nuevo', () => {
    it('lo abre dentro de la rejilla y a todo el ancho', () => {
        render(<FieldsList step={step} formularioSlug="demo" onChange={vi.fn()} />);

        fireEvent.click(screen.getByText('Agregar campo en nueva línea'));

        const celda = rejilla(bloqueNuevo())
            && [ ...rejilla(bloqueNuevo()).children ].find((h) => h.contains(bloqueNuevo()));
        expect(celda).toBeTruthy();
        expect(celda.style.gridColumn).toBe('1 / -1');
    });

    it('lo coloca en la linea donde se pidio el hueco, no al final', () => {
        render(<FieldsList step={step} formularioSlug="demo" onChange={vi.fn()} />);

        const huecos = screen.getAllByLabelText('Agregar un campo en este espacio libre');
        fireEvent.click(huecos[0]);

        const grid = rejilla(bloqueNuevo());
        const posNuevo = posicionEnRejilla(bloqueNuevo());
        const posCampoB = posicionEnRejilla(screen.getByText('Campo B'));

        expect(posNuevo).toBeLessThan(posCampoB);
        expect(posNuevo).toBeLessThan(grid.children.length - 1);
    });

    it('esconde la barra de agregar mientras el formulario esta abierto', () => {
        render(<FieldsList step={step} formularioSlug="demo" onChange={vi.fn()} />);

        fireEvent.click(screen.getByText('Agregar campo en nueva línea'));

        expect(screen.queryByText('Agregar campo en nueva línea')).not.toBeInTheDocument();
    });

    it('resalta con borde el contenedor abierto, tanto al agregar como al editar', () => {
        render(<FieldsList step={step} formularioSlug="demo" onChange={vi.fn()} />);

        fireEvent.click(screen.getByText('Agregar campo en nueva línea'));
        expect(bloqueNuevo().style.borderWidth).toBe('2px');

        const wrapperB = screen.getByText('Campo B').closest('[data-field-wrapper]');
        const tarjetaB = wrapperB.querySelector('.ant-card');
        expect(tarjetaB.style.borderWidth).toBe('');

        fireEvent.click(within(wrapperB).getByLabelText('edit'));
        expect(tarjetaB.style.borderWidth).toBe('2px');
    });
});
