import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import UserCard from '@features/users/components/UserCard';

const baseUser = {
    id: 5,
    username: 'usuario_test',
    name: 'Usuario Test',
    email: 'usuario@test.com',
    role: 'editora',
    projects: [
        { slug: 'sieej', name: 'SIEEJ', project_role: 'editor' },
    ],
    must_change_password: false,
    avatarUrl: null,
};

const renderCard = (overrides = {}, handlers = {}) => {
    const onEdit = handlers.onEdit ?? vi.fn();
    const onResetPassword = handlers.onResetPassword ?? vi.fn();
    const onDelete = handlers.onDelete ?? vi.fn();
    render(
        <UserCard
            user={{ ...baseUser, ...overrides }}
            onEdit={onEdit}
            onResetPassword={onResetPassword}
            onDelete={onDelete}
            isSelf={handlers.isSelf ?? false}
        />,
    );
    return { onEdit, onResetPassword, onDelete };
};

describe('UserCard', () => {
    it('muestra nombre, username, email y rol traducido', () => {
        renderCard();
        expect(screen.getByText('Usuario Test')).toBeInTheDocument();
        expect(screen.getByText('@usuario_test')).toBeInTheDocument();
        expect(screen.getByText('usuario@test.com')).toBeInTheDocument();
        expect(screen.getByText('Editora')).toBeInTheDocument();
    });

    it('admin global se muestra como "Administradora" + "Todos los proyectos"', () => {
        renderCard({ role: 'tetlamamakani', projects: [] });
        expect(screen.getByText('Administradora')).toBeInTheDocument();
        expect(screen.getByText('Todos los proyectos')).toBeInTheDocument();
    });

    it('usuario sin proyectos asignados muestra placeholder', () => {
        renderCard({ projects: [] });
        expect(screen.getByText('Sin proyectos asignados')).toBeInTheDocument();
    });

    it('proyectos asignados se muestran como tags con rol', () => {
        renderCard({
            projects: [
                { slug: 'portal', name: 'Portal', project_role: 'viewer' },
                { slug: 'mapalab', name: 'MapaLab', project_role: 'editor' },
            ],
        });
        expect(screen.getByText('Portal: Viewer')).toBeInTheDocument();
        expect(screen.getByText('MapaLab: Editor')).toBeInTheDocument();
    });

    it('hint de must_change_password aparece solo cuando aplica', () => {
        const { unmount } = render(
            <UserCard
                user={{ ...baseUser, must_change_password: true }}
                onEdit={vi.fn()}
                onResetPassword={vi.fn()}
                onDelete={vi.fn()}
            />,
        );
        expect(screen.getByText(/Pendiente cambio de contraseña/)).toBeInTheDocument();
        unmount();
        renderCard({ must_change_password: false });
        expect(screen.queryByText(/Pendiente cambio de contraseña/)).not.toBeInTheDocument();
    });

    it('click en la card invoca onEdit', () => {
        const { onEdit } = renderCard();
        fireEvent.click(screen.getByText('Usuario Test'));
        expect(onEdit).toHaveBeenCalled();
    });

    it('isSelf deshabilita acciones de Resetear y Eliminar', () => {
        renderCard({}, { isSelf: true });
        const resetBtn = screen.getByLabelText('Resetear contraseña');
        const deleteBtn = screen.getByLabelText('Eliminar');
        expect(resetBtn).toBeDisabled();
        expect(deleteBtn).toBeDisabled();
    });

    it('Editar nunca se deshabilita por isSelf', () => {
        renderCard({}, { isSelf: true });
        expect(screen.getByLabelText('Editar')).not.toBeDisabled();
    });

    it('rol externo se muestra como "Externo" con color verde', () => {
        renderCard({ role: 'externo' });
        expect(screen.getByText('Externo')).toBeInTheDocument();
    });
});
