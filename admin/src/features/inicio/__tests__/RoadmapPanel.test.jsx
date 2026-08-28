import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import RoadmapPanel from '@features/inicio/components/RoadmapPanel';
import { HITOS } from '@features/inicio/constants/roadmapHitos';
import { acomodar, anchoDe } from '@features/inicio/helpers/roadmapLayout';

const montar = () => render(<MemoryRouter><RoadmapPanel /></MemoryRouter>);

describe('acomodar', () => {
    it('nunca encima dos etiquetas del mismo nivel', () => {
        const porNivel = {};
        acomodar(HITOS).filter((h) => h.tipo !== 'momento').forEach((h) => {
            const previo = porNivel[h.ly];
            if (previo) expect(h.lx - anchoDe(h) / 2).toBeGreaterThan(previo);
            porNivel[h.ly] = h.lx + anchoDe(h) / 2;
        });
    });

    it('ordena los hitos por fecha sobre el eje', () => {
        const puestos = acomodar(HITOS);
        puestos.slice(1).forEach((h, i) => {
            expect(h.px).toBeGreaterThanOrEqual(puestos[i].px);
        });
    });
});

describe('RoadmapPanel', () => {
    it('encabeza la sección con el título en español', () => {
        montar();
        expect(screen.getByText('Hoja de ruta')).toBeInTheDocument();
    });

    it('dibuja las versiones mayores y no los primeros pasos', () => {
        montar();
        expect(screen.getByText('mariachi 2')).toBeInTheDocument();
        expect(screen.getByText('geoserver 1')).toBeInTheDocument();
        expect(screen.queryByText('mariachi 0.1')).not.toBeInTheDocument();
    });

    it('conserva el nombre viejo cuando el proyecto se renombró', () => {
        montar();
        expect(screen.getByText('frigate')).toBeInTheDocument();
        expect(screen.getByText('wacha')).toBeInTheDocument();
    });

    it('marca los ciclos con su ventana', () => {
        montar();
        expect(screen.getByText('tamal-rojo')).toBeInTheDocument();
        expect(screen.getByText('tamal-verde')).toBeInTheDocument();
    });

    it('abre el motivo al pasar por un hito', () => {
        montar();
        fireEvent.mouseEnter(screen.getByText('mariachi 2').closest('g'));
        expect(screen.getByText(/la identidad se va a minerva/i)).toBeInTheDocument();
    });

    it('el botón de seguimiento cambia a scroll libre', () => {
        montar();
        const boton = screen.getByRole('button', { name: 'Siguiendo' });
        fireEvent.click(boton);
        expect(screen.getByRole('button', { name: 'Scroll libre' })).toBeInTheDocument();
    });
});
