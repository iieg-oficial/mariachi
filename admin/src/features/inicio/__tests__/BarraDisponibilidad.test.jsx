import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BarraDisponibilidad from '@features/inicio/components/BarraDisponibilidad';
import { SEMANTIC } from '@app/providers/brand';

const conTramos = (tramos) => ({
    desde: '2026-08-20T22:46:00Z',
    hasta: '2026-08-21T22:46:00Z',
    resolucion_seg: 60,
    celdas: 1440,
    tramos,
});

const segmentos = () => Array.from(
    screen.getByLabelText('Disponibilidad de las últimas 24 horas').children,
);

describe('BarraDisponibilidad', () => {
    it('un tramo operativo se pinta con la superficie, sin trama', () => {
        render(<BarraDisponibilidad tramos={conTramos([
            { min: 0, dur: 1440, estado: 'ok', detalle: null },
        ])} />);
        const [tramo] = segmentos();
        expect(tramo.style.backgroundColor).toBe(SEMANTIC.successSoft);
        expect(tramo.style.backgroundImage).toBe('none');
        expect(tramo.style.minWidth).toBe('2px');
    });

    it('una caida corta se pinta solida para que no quede como un punto', () => {
        render(<BarraDisponibilidad tramos={conTramos([
            { min: 0, dur: 1437, estado: 'ok', detalle: null },
            { min: 1437, dur: 3, estado: 'down', detalle: 'timed out' },
        ])} />);
        const marca = segmentos()[1];
        expect(marca.style.minWidth).toBe('4px');
        expect(marca.style.backgroundImage).toBe('none');
    });

    it('una caida larga conserva la trama en lugar del solido', () => {
        render(<BarraDisponibilidad tramos={conTramos([
            { min: 0, dur: 1140, estado: 'ok', detalle: null },
            { min: 1140, dur: 300, estado: 'down', detalle: 'HTTP 404' },
        ])} />);
        const caida = segmentos()[1];
        expect(caida.style.minWidth).toBe('2px');
        expect(caida.style.backgroundImage).toContain(SEMANTIC.danger);
    });

    it('un hueco corto de datos no se marca como incidente', () => {
        render(<BarraDisponibilidad tramos={conTramos([
            { min: 0, dur: 1438, estado: 'ok', detalle: null },
            { min: 1438, dur: 2, estado: 'sin_datos', detalle: null },
        ])} />);
        expect(segmentos()[1].style.minWidth).toBe('2px');
    });

    it('sin historial dibuja el riel vacio', () => {
        render(<BarraDisponibilidad tramos={null} />);
        expect(screen.getByLabelText('Sin historial de disponibilidad')).toBeInTheDocument();
    });
});
