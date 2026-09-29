import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

const CAMARAS = [
    { id: 1, nombre: 'canal_01', etiqueta: 'Porton' },
    { id: 2, nombre: 'canal_02', etiqueta: 'Caseta' },
    { id: 3, nombre: 'canal_03', etiqueta: 'Bicicletas' },
];

vi.mock('../hooks/useCamarasEnVivo', () => ({
    default: () => ({
        camaras: CAMARAS,
        estados: { canal_02: { en_linea: true, camera_fps: 5 } },
        cargando: false,
    }),
}));

const cabecera = { actual: null };
vi.mock('@app/fullscreenHeader', () => ({
    useFullscreenHeader: (h) => { cabecera.actual = h; },
}));

vi.mock('@shared/hooks/useIsMobile', () => ({ default: () => false }));

import CamaraPantallaPage from '../pages/CamaraPantallaPage';

const Ruta = () => <span data-testid="ruta">{useLocation().pathname}</span>;

const montar = (nombre) => render(
    <MemoryRouter initialEntries={[`/frames/vivo/pantalla/${nombre}`]}>
        <Routes>
            <Route path="/frames/vivo/pantalla/:nombre" element={<><CamaraPantallaPage /><Ruta /></>} />
        </Routes>
    </MemoryRouter>,
);

const extra = () => render(<MemoryRouter>{cabecera.actual.extra}</MemoryRouter>);

describe('CamaraPantallaPage', () => {
    beforeEach(() => { cabecera.actual = null; });

    it('muestra la camara pedida y dice cual es de cuantas', () => {
        montar('canal_02');
        expect(screen.getByAltText('Vista de Caseta')).toBeInTheDocument();
        expect(cabecera.actual.title).toBe('Caseta · 2 de 3');
        expect(cabecera.actual.backTo).toBe('/frames/vivo');
    });

    it('las flechas del teclado pasan a la siguiente y a la anterior, dando la vuelta', () => {
        montar('canal_03');
        fireEvent.keyDown(window, { key: 'ArrowRight' });
        expect(screen.getByTestId('ruta')).toHaveTextContent('/frames/vivo/pantalla/canal_01');
        fireEvent.keyDown(window, { key: 'ArrowLeft' });
        expect(screen.getByTestId('ruta')).toHaveTextContent('/frames/vivo/pantalla/canal_03');
    });

    it('los botones de la cabecera navegan igual que el teclado', () => {
        montar('canal_01');
        const { getByLabelText } = extra();
        expect(getByLabelText('Cámara siguiente')).toBeInTheDocument();
        expect(getByLabelText('Cámara anterior')).toBeInTheDocument();
    });

    it('una camara que no existe no truena: avisa', () => {
        montar('no_existe');
        expect(screen.getByText('Esa cámara no existe o está apagada')).toBeInTheDocument();
    });
});
