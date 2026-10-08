import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import EventosTable from '@features/mapalab-stats/components/EventosTable';

const fila = (extra) => ({
    eventoId: '2',
    titulo: 'Independencia en Jalisco',
    modo: 'lite',
    opens: 0,
    closes: 0,
    funFacts: 65,
    centers: 0,
    shares: 0,
    returns: 7,
    uniqueSessions: 14,
    ...extra,
});

const celdasDe = (titulo) => within(screen.getByText(titulo).closest('tr')).getAllByRole('cell').map((c) => c.textContent);

describe('EventosTable', () => {
    it('un evento lite muestra sus datos curiosos y deja en guion lo que no aplica', () => {
        render(<EventosTable rows={[fila()]} />);
        expect(celdasDe('Independencia en Jalisco')).toEqual([
            'Independencia en Jalisco2', 'Lite', '—', '65', '7', '—', '—', '14',
        ]);
    });

    it('un evento completo muestra aperturas, centrar y compartir', () => {
        render(<EventosTable rows={[fila({ eventoId: '1', titulo: 'Mundial', modo: 'completo', opens: 323, centers: 3, shares: 4, funFacts: 3, returns: 0, uniqueSessions: 41 })]} />);
        expect(celdasDe('Mundial')).toEqual(['Mundial1', 'Completo', '323', '3', '0', '3', '4', '41']);
    });

    it('sin filas explica que los datos curiosos también cuentan', () => {
        render(<EventosTable rows={[]} />);
        expect(screen.getByText(/dato curioso/)).toBeTruthy();
    });
});
