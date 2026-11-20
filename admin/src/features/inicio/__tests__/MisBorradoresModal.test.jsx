import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

vi.mock('@features/inicio/api/inicioService', () => ({
    getMisBorradores: vi.fn(),
    descartarMiBorrador: vi.fn().mockResolvedValue({}),
}));

import { descartarMiBorrador } from '@features/inicio/api/inicioService';
import MisBorradoresModal from '@features/inicio/components/MisBorradoresModal';

const BORRADORES = [
    { id: 1, resource_type: 'sld', resource_id: 's:a', estado: 'en_progreso', data: {} },
    { id: 2, resource_type: 'evento', resource_id: '9', estado: 'rechazado', data: { titulo: 'Lluvias' } },
];

describe('MisBorradoresModal', () => {
    it('descarta un solo borrador y deja los demás', async () => {
        const onCambio = vi.fn();
        const onClose = vi.fn();
        render(
            <MemoryRouter>
                <MisBorradoresModal open borradores={BORRADORES} onClose={onClose} onCambio={onCambio} />
            </MemoryRouter>,
        );

        fireEvent.click(screen.getAllByLabelText('Descartar borrador')[1]);
        fireEvent.click(await screen.findByRole('button', { name: 'Descartar' }));

        await waitFor(() => expect(descartarMiBorrador).toHaveBeenCalledWith(2));
        await waitFor(() => expect(screen.queryByText('Lluvias')).toBeNull());
        expect(screen.getByText('s:a')).toBeTruthy();
        expect(onCambio).toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
    });
});
