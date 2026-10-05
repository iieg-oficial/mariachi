import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import FormularioModal from '../components/FormularioModal';

const CAMPOS = [{ nombre: 'nombre', etiqueta: 'Nombre', requerido: true, maximo: 100 }];

describe('FormularioModal', () => {
    it('precarga los valores al editar', async () => {
        render(<FormularioModal abierto titulo="Editar" campos={CAMPOS} inicial={{ nombre: 'Normativa' }} onCancelar={() => {}} onGuardar={() => {}} />);
        await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue('Normativa'));
    });

    it('guarda lo que se escribió al dar de alta, también al reabrir', async () => {
        const onGuardar = vi.fn();
        const { rerender } = render(<FormularioModal abierto titulo="Nueva" campos={CAMPOS} inicial={null} onCancelar={() => {}} onGuardar={onGuardar} />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Normativa' } });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
        await waitFor(() => expect(onGuardar).toHaveBeenCalledWith({ nombre: 'Normativa' }));
        rerender(<FormularioModal abierto={false} titulo="Nueva" campos={CAMPOS} inicial={null} onCancelar={() => {}} onGuardar={onGuardar} />);
        rerender(<FormularioModal abierto titulo="Nueva" campos={CAMPOS} inicial={null} onCancelar={() => {}} onGuardar={onGuardar} />);
        fireEvent.change(await screen.findByRole('textbox'), { target: { value: 'Leyes' } });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
        await waitFor(() => expect(onGuardar).toHaveBeenLastCalledWith({ nombre: 'Leyes' }));
        expect(screen.queryByText('Falta: Nombre')).not.toBeInTheDocument();
    });
});
