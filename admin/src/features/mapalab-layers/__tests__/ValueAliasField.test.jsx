import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ValueAliasField from '../components/layersEditor/ValueAliasField';

const abrir = (props) => {
    render(<ValueAliasField {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Alias de valores/ }));
};

describe('ValueAliasField', () => {
    it('agrega un alias solo cuando tiene valor y texto', () => {
        const onChange = vi.fn();
        abrir({ value: undefined, onChange });
        fireEvent.click(screen.getByRole('button', { name: /Agregar alias/ }));
        fireEvent.change(screen.getByLabelText('Valor'), { target: { value: '0' } });
        expect(onChange).not.toHaveBeenCalled();
        fireEvent.change(screen.getByLabelText('Mostrar como'), { target: { value: 'Sin registros' } });
        expect(onChange).toHaveBeenCalledWith({ 0: 'Sin registros' });
    });

    it('quita la llave al borrar el último alias', () => {
        const onChange = vi.fn();
        abrir({ value: { 0: 'Sin registros' }, onChange });
        fireEvent.click(screen.getByRole('button', { name: 'Quitar alias' }));
        expect(onChange).toHaveBeenCalledWith(undefined);
    });

    it('tolera un alias vacío que venga del JSON', () => {
        abrir({ value: { 0: '' }, onChange: vi.fn() });
        expect(screen.getByLabelText('Valor').value).toBe('0');
    });
});
