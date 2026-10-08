import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

import usePantallaCompleta from '@shared/hooks/usePantallaCompleta';

function Sujeto({ alFallar }) {
    const { marcoRef, activa, alternar } = usePantallaCompleta(alFallar);
    return (
        <div>
            <div ref={marcoRef} data-testid="marco" />
            <span data-testid="estado">{activa ? 'dentro' : 'fuera'}</span>
            <button type="button" onClick={alternar}>Alternar</button>
        </div>
    );
}

const fingirDentro = (elemento) => {
    Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        get: () => elemento,
    });
    act(() => { document.dispatchEvent(new Event('fullscreenchange')); });
};

afterEach(() => {
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => null });
    delete Element.prototype.requestFullscreen;
});

describe('usePantallaCompleta', () => {
    it('arranca fuera', () => {
        render(<Sujeto />);
        expect(screen.getByTestId('estado')).toHaveTextContent('fuera');
    });

    it('se enciende solo cuando el elemento expandido es el suyo', () => {
        render(<Sujeto />);

        fingirDentro(document.body);
        expect(screen.getByTestId('estado')).toHaveTextContent('fuera');

        fingirDentro(screen.getByTestId('marco'));
        expect(screen.getByTestId('estado')).toHaveTextContent('dentro');
    });

    it('vuelve a fuera cuando el navegador sale', () => {
        render(<Sujeto />);
        fingirDentro(screen.getByTestId('marco'));

        fingirDentro(null);

        expect(screen.getByTestId('estado')).toHaveTextContent('fuera');
    });

    it('avisa cuando el navegador niega la pantalla completa', async () => {
        const alFallar = vi.fn();
        Element.prototype.requestFullscreen = vi.fn(() => Promise.reject(new Error('no')));
        render(<Sujeto alFallar={alFallar} />);

        await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Alternar' })); });

        expect(alFallar).toHaveBeenCalled();
    });
});
