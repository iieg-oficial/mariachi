import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GraficaTemperaturas from '@shared/components/nodos/GraficaTemperaturas';

const serie = (nombre, valores) => ({
    nombre,
    puntos: valores.map((celsius, i) => ({
        momento: new Date(Date.UTC(2026, 7, 28, 10 + i)).toISOString(),
        celsius,
    })),
});

describe('GraficaTemperaturas', () => {
    it('dibuja una línea por sensor', () => {
        const { container } = render(
            <GraficaTemperaturas series={[serie('CPU', [70, 75, 80]), serie('Disco', [38, 39, 40])]} />,
        );
        expect(container.querySelectorAll('path')).toHaveLength(2);
    });

    it('la leyenda solo nombra el sensor: los grados ya están arriba', () => {
        render(<GraficaTemperaturas series={[serie('CPU', [70, 75, 82])]} />);
        expect(screen.getByText('CPU')).toBeInTheDocument();
        expect(screen.queryByText(/82/)).not.toBeInTheDocument();
    });

    it('con un solo punto no dibuja: una línea de un punto no es tendencia', () => {
        render(<GraficaTemperaturas series={[serie('CPU', [70])]} />);
        expect(screen.getByText(/Aún no hay suficientes lecturas/)).toBeInTheDocument();
    });

    it('sin series lo dice en vez de dibujar ejes vacíos', () => {
        render(<GraficaTemperaturas series={[]} />);
        expect(screen.getByText(/Aún no hay suficientes lecturas/)).toBeInTheDocument();
    });

    it('mientras carga no promete que no haya datos', () => {
        render(<GraficaTemperaturas series={[]} cargando />);
        expect(screen.getByText('Cargando historial…')).toBeInTheDocument();
        expect(screen.queryByText(/Aún no hay suficientes/)).not.toBeInTheDocument();
    });
});
