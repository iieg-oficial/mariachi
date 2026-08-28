import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import RoadmapPanel from '@features/inicio/components/RoadmapPanel';
import { ROADMAP } from '@features/inicio/constants/roadmap';

const montar = () => render(<MemoryRouter><RoadmapPanel /></MemoryRouter>);

describe('RoadmapPanel', () => {
    it('encabeza la sección con el título en español', () => {
        montar();
        expect(screen.getByText('Hoja de ruta')).toBeInTheDocument();
    });

    it('muestra una ficha por proyecto con el nombre del catálogo', () => {
        montar();
        expect(screen.getByText('Mariachi')).toBeInTheDocument();
        expect(screen.getByText('MapaLab')).toBeInTheDocument();
        expect(screen.getByText('Gateway Hub')).toBeInTheDocument();
    });

    it('lista cada versión mayor con su fecha de salida', () => {
        montar();
        expect(screen.getAllByText('v2.0.0').length).toBe(4);
        expect(screen.getByText('14 may 2026')).toBeInTheDocument();
        expect(screen.getAllByText('10 ago 2026').length).toBe(2);
    });

    it('marca como pendiente la versión sin fecha', () => {
        montar();
        expect(screen.getAllByText('Por salir').length).toBe(
            ROADMAP.flatMap((p) => p.versiones).filter((v) => !v.fecha).length,
        );
    });

    it('acompaña cada versión con su motivo', () => {
        montar();
        const motivos = ROADMAP.flatMap((p) => p.versiones).map((v) => v.motivo);
        motivos.forEach((motivo) => {
            expect(screen.getByText(motivo)).toBeInTheDocument();
        });
    });
});
