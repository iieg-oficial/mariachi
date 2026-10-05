import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../api/espaciosService', () => ({
    historialEspacio: vi.fn(async () => [
        {
            id: 2, accion: 'update', cambio_trazo: false, quien: 'Ana López', origen: 'mariachi', cuando: '2026-10-05T18:00:00Z',
            antes: { nombre: 'Área de auditorio', tipo: 'sala', incluir: true }, despues: { nombre: 'Auditorio', tipo: 'sala', incluir: true },
        },
        {
            id: 1, accion: 'insert', cambio_trazo: true, quien: 'carga inicial', origen: 'carga', cuando: '2026-10-05T17:00:00Z',
            antes: null, despues: { nombre: 'Área de auditorio', tipo: 'sala', incluir: true },
        },
    ]),
    restaurarEspacio: vi.fn(),
}));

import HistorialEspacio from '../components/HistorialEspacio';

describe('HistorialEspacio', () => {
    it('muestra qué cambió, quién y desde dónde, y deja volver a una versión anterior', async () => {
        render(
            <HistorialEspacio
                espacio={{ fid: 7, nombre: 'Auditorio' }}
                pisos={[{ id: 1, nombre: 'Planta baja' }]}
                puedeGestionar
                onCerrar={() => {}}
                onRestaurado={() => {}}
            />,
        );
        expect(await screen.findByText('Nombre: «Área de auditorio» → «Auditorio»')).toBeInTheDocument();
        expect(screen.getByText(/Ana López · mariachi/)).toBeInTheDocument();
        expect(screen.getByText('Alta del espacio')).toBeInTheDocument();
        expect(screen.getByText(/carga inicial · carga inicial/)).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: 'Volver a esta versión' })).toHaveLength(1);
    });
});
