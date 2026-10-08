import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import InfoBoxEditor from '@features/mapalab-layers/components/layersEditor/InfoBoxEditor';

const CONFIG = { headerField: 'nombre', list: [{ label: 'Turno', field: 'turno' }] };
const HEREDADA = { id: 'g1', label: 'Salud', config: CONFIG };

describe('InfoBoxEditor', () => {
    it('en lienzo no dibuja nada cuando la tarjetita está vacía', () => {
        const { container } = render(<InfoBoxEditor value={null} onChange={vi.fn()} mode="lienzo" />);
        expect(container).toBeEmptyDOMElement();
    });

    it('en lienzo sí dibuja la heredada del grupo', () => {
        render(<InfoBoxEditor value={null} onChange={vi.fn()} mode="lienzo" inherited={HEREDADA} />);
        expect(screen.getByText('Personalizar para esta capa')).toBeInTheDocument();
    });

    it('en lienzo dibuja la tarjeta cuando hay configuración', () => {
        render(<InfoBoxEditor value={CONFIG} onChange={vi.fn()} mode="lienzo" />);
        expect(screen.getByLabelText('Sección Lista')).toBeInTheDocument();
    });

    it('en lista sigue ofreciendo los bloques aunque esté vacía', () => {
        render(<InfoBoxEditor value={null} onChange={vi.fn()} mode="visual" />);
        expect(screen.getByText('Agrega un bloque para empezar.')).toBeInTheDocument();
    });
});
