import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import UserFormFooter from '@features/users/components/UserFormFooter';

const editando = { id: 7, name: 'Usuario Test', username: 'usuario_test' };

const renderFooter = (props = {}) => {
    const onDelete = props.onDelete ?? vi.fn();
    const onCancel = props.onCancel ?? vi.fn();
    const onSubmit = props.onSubmit ?? vi.fn();
    render(
        <UserFormFooter
            editingUser={'editingUser' in props ? props.editingUser : editando}
            puedeEliminar={props.puedeEliminar ?? true}
            esPropio={props.esPropio ?? false}
            onDelete={onDelete}
            onCancel={onCancel}
            onSubmit={onSubmit}
        />,
    );
    return { onDelete, onCancel, onSubmit };
};

describe('UserFormFooter', () => {
    it('editando ofrece el borrado con etiqueta explicita', () => {
        const { onDelete } = renderFooter();
        const boton = screen.getByRole('button', { name: /eliminar usuario/i });
        fireEvent.click(boton);
        expect(onDelete).toHaveBeenCalledWith(editando);
    });

    it('en un alta no se puede borrar', () => {
        renderFooter({ editingUser: null });
        expect(screen.queryByRole('button', { name: /eliminar usuario/i })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Crear' })).toBeInTheDocument();
    });

    it('sin permiso de borrado el boton no existe', () => {
        renderFooter({ puedeEliminar: false });
        expect(screen.queryByRole('button', { name: /eliminar usuario/i })).not.toBeInTheDocument();
    });

    it('no se puede borrar el propio usuario', () => {
        renderFooter({ esPropio: true });
        expect(screen.getByRole('button', { name: /eliminar usuario/i })).toBeDisabled();
    });

    it('editando el boton primario dice Actualizar', () => {
        const { onSubmit } = renderFooter();
        fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
        expect(onSubmit).toHaveBeenCalled();
    });
});
