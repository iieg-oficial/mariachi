import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import RoadmapAcciones from '@features/inicio/components/roadmap/RoadmapAcciones';

const montar = (props) => {
    const onZoom = vi.fn();
    render(
        <RoadmapAcciones
            verOcultos={false}
            pausado={false}
            pantallaCompleta
            editando={false}
            puedeEditar={false}
            zoom={1}
            onZoom={onZoom}
            onVerOcultos={() => {}}
            onPausa={() => {}}
            onPantalla={() => {}}
            onEditar={() => {}}
            {...props}
        />,
    );
    return onZoom;
};

describe('RoadmapAcciones', () => {
    it('acerca y aleja en pasos de veinte por ciento', () => {
        const onZoom = montar();

        fireEvent.click(screen.getByRole('button', { name: 'Acercar el mapa' }));
        expect(onZoom).toHaveBeenCalledWith(0.2);

        fireEvent.click(screen.getByRole('button', { name: 'Alejar el mapa' }));
        expect(onZoom).toHaveBeenCalledWith(-0.2);
    });

    it('muestra el porcentaje vigente', () => {
        montar({ zoom: 1.6 });
        expect(screen.getByText('160%')).toBeInTheDocument();
    });

    it('bloquea los topes', () => {
        montar({ zoom: 3 });
        expect(screen.getByRole('button', { name: 'Acercar el mapa' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Alejar el mapa' })).not.toBeDisabled();
    });

    it('esconde el zoom cuando no hay pantalla completa', () => {
        montar({ pantallaCompleta: false });
        expect(screen.queryByRole('button', { name: 'Acercar el mapa' })).not.toBeInTheDocument();
    });
});
