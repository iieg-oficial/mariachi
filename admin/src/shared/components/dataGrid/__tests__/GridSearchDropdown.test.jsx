import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GridSearchDropdown from '@shared/components/dataGrid/GridSearchDropdown';

const renderDropdown = (props = {}) => {
    const onOpenChange = vi.fn();
    const onChange = vi.fn();
    const view = render(
        <GridSearchDropdown
            placeholder="Buscar capa"
            onOpenChange={onOpenChange}
            onChange={onChange}
            {...props}
        />,
    );
    return { ...view, onOpenChange, onChange };
};

describe('GridSearchDropdown', () => {
    it('abierto por fuera, enfoca el campo para escribir de inmediato', async () => {
        renderDropdown({ open: true });

        const input = await screen.findByPlaceholderText('Buscar capa');
        await waitFor(() => expect(document.activeElement).toBe(input));
    });

    it('Escape lo cierra', async () => {
        const { onOpenChange } = renderDropdown({ open: true });

        fireEvent.keyDown(await screen.findByPlaceholderText('Buscar capa'), { key: 'Escape' });

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('Enter lo cierra dejando el filtro puesto', async () => {
        const { onOpenChange, onChange } = renderDropdown({ open: true });
        const input = await screen.findByPlaceholderText('Buscar capa');

        fireEvent.change(input, { target: { value: 'hospitales' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(onChange).toHaveBeenCalledWith('hospitales');
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('cerrado no monta el campo', () => {
        renderDropdown({ open: false });

        expect(screen.queryByPlaceholderText('Buscar capa')).toBeNull();
    });
});
