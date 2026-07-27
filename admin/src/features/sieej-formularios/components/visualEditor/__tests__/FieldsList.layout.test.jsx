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
        { name: 'b', label: 'Campo B', type: 'text', layout: { colSpan: 2, col: 4 } },
    ],
};

const cardOf = (label) => screen.getAllByText(label)
    .map((el) => el.closest('[data-field-wrapper]'))
    .find(Boolean);

const openEditorOf = (label) => fireEvent.click(within(cardOf(label)).getByLabelText('edit'));

describe('FieldsList · acomodo en vivo', () => {
    it('mantiene abierto el editor cuando el cambio de posición mueve el campo de línea', async () => {
        render(<FieldsList step={step} formularioSlug="demo" onChange={vi.fn()} />);

        openEditorOf('Campo B');
        fireEvent.click(await screen.findByText('Izquierda'));

        expect(await screen.findByText('¿Cómo se acomoda el campo?')).toBeInTheDocument();
        expect(screen.getByText('Vista previa')).toBeInTheDocument();
    });

    it('conserva la posición elegida en lugar de revertirla al valor guardado', async () => {
        render(<FieldsList step={step} formularioSlug="demo" onChange={vi.fn()} />);

        openEditorOf('Campo B');
        fireEvent.click(await screen.findByText('Izquierda'));

        expect(
            await screen.findByText('Empieza una línea nueva, pegado a la izquierda.'),
        ).toBeInTheDocument();
    });

    it('el cambio de ancho tampoco reabre ni reinicia el editor', async () => {
        render(<FieldsList step={step} formularioSlug="demo" onChange={vi.fn()} />);

        openEditorOf('Campo B');
        fireEvent.click(await screen.findByText('Un tercio'));

        expect(await screen.findByText('Centro')).toBeInTheDocument();
        expect(screen.getByText('Vista previa')).toBeInTheDocument();
    });

    it('no arrastra el acomodo de un campo al abrir el editor de otro', async () => {
        render(<FieldsList step={step} formularioSlug="demo" onChange={vi.fn()} />);

        openEditorOf('Campo B');
        fireEvent.click(await screen.findByText('Izquierda'));
        fireEvent.click(await screen.findByText('Un tercio'));

        openEditorOf('Campo A');

        expect(
            await screen.findByText('Empieza una línea nueva, pegado a la izquierda.'),
        ).toBeInTheDocument();
        expect(screen.queryByText('Centro')).not.toBeInTheDocument();
    });
});
