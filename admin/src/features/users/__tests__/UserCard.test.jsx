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
    avatarUrl: null,
    created_at: '2026-08-12T10:00:00',
    minerva_vinculado: true,
};

const renderCard = (overrides = {}, props = {}) => {
    const onEdit = props.onEdit ?? vi.fn();
    render(
        <UserCard
            user={{ ...baseUser, ...overrides }}
            onEdit={onEdit}
            puedeEditar={props.puedeEditar ?? true}
            detalleVisible={props.detalleVisible ?? true}
        />,
    );
    return { onEdit };
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

    it('la card no ofrece acciones directas', () => {
        renderCard();
        expect(screen.queryAllByRole('button', { name: /eliminar|editar$/i })).toHaveLength(0);
    });

    it('click en la card invoca onEdit', () => {
        const { onEdit } = renderCard();
        fireEvent.click(screen.getByText('Usuario Test'));
        expect(onEdit).toHaveBeenCalled();
    });

    it('la card se abre con Enter desde el teclado', () => {
        const { onEdit } = renderCard();
        fireEvent.keyDown(screen.getByLabelText('Editar Usuario Test'), { key: 'Enter' });
        expect(onEdit).toHaveBeenCalled();
    });

    it('sin permiso de gestion la card deja de ser interactiva', () => {
        const { onEdit } = renderCard({}, { puedeEditar: false });
        expect(screen.queryByLabelText('Editar Usuario Test')).not.toBeInTheDocument();
        fireEvent.click(screen.getByText('Usuario Test'));
        expect(onEdit).not.toHaveBeenCalled();
    });

    it('sin detalle visible no promete "Sin proyectos asignados"', () => {
        renderCard({ projects: [] }, { detalleVisible: false });
        expect(screen.queryByText('Sin proyectos asignados')).not.toBeInTheDocument();
    });

    it('distingue al usuario vinculado con minerva del que no lo esta', () => {
        renderCard();
        expect(screen.getByText('Minerva')).toBeInTheDocument();
    });

    it('usuario sin vincular se marca como pendiente', () => {
        renderCard({ minerva_vinculado: false });
        expect(screen.getByText('Sin vincular')).toBeInTheDocument();
    });

    it('muestra la dependencia de SIEEJ del usuario externo', () => {
        renderCard({ role: 'externo', sieej_grupo: { id: 3, nombre: 'IIEG' } });
        expect(screen.getByText('IIEG')).toBeInTheDocument();
    });

    it('muestra la fecha de alta', () => {
        renderCard();
        expect(screen.getByText(/^Alta /)).toBeInTheDocument();
    });
});
