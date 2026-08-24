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
    ultimo_acceso: '2026-08-20T09:00:00',
    must_change_password: false,
};

const renderCard = (overrides = {}, props = {}) => {
    const onEdit = props.onEdit ?? vi.fn();
    render(
        <UserCard
            user={{ ...baseUser, ...overrides }}
            onEdit={onEdit}
            puedeEditar={props.puedeEditar ?? true}
            detalleVisible={props.detalleVisible ?? true}
            proyectosDelSistema={props.proyectosDelSistema ?? [
                { slug: 'sieej', name: 'SIEEJ' },
                { slug: 'portal', name: 'Portal' },
                { slug: 'mapalab', name: 'MapaLab' },
            ]}
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

    it('el rol tetlamamakani se muestra con su nombre', () => {
        renderCard({ role: 'tetlamamakani', projects: [] });
        expect(screen.getByText('Tetlamamakani')).toBeInTheDocument();
    });

    it('la tetlamamakani cuenta los proyectos del sistema, no una frase', () => {
        renderCard({ role: 'tetlamamakani', projects: [] });
        expect(screen.getByText('3 proyectos')).toBeInTheDocument();
        expect(screen.queryByText('Todos los proyectos')).not.toBeInTheDocument();
    });

    it('usuario sin proyectos lo dice sin listar nada', () => {
        renderCard({ projects: [] });
        expect(screen.getByText('Sin proyectos')).toBeInTheDocument();
    });

    it('los proyectos se resumen en un contador, no en una etiqueta por proyecto', () => {
        renderCard({
            projects: [
                { slug: 'portal', name: 'Portal', project_role: 'viewer' },
                { slug: 'mapalab', name: 'MapaLab', project_role: 'editor' },
            ],
        });
        expect(screen.getByText('2 proyectos')).toBeInTheDocument();
        expect(screen.queryByText(/Portal/)).not.toBeInTheDocument();
    });

    it('un solo proyecto se escribe en singular', () => {
        renderCard();
        expect(screen.getByText('1 proyecto')).toBeInTheDocument();
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

    it('sin detalle visible no promete "Sin proyectos"', () => {
        renderCard({ projects: [] }, { detalleVisible: false });
        expect(screen.queryByText('Sin proyectos')).not.toBeInTheDocument();
    });

    it('una cuenta sin pendientes se marca al dia', () => {
        renderCard();
        expect(screen.getByLabelText('Cuenta al día')).toBeInTheDocument();
    });

    it('los pendientes de la cuenta se enumeran en el nombre accesible', () => {
        renderCard({ minerva_vinculado: false, ultimo_acceso: null, projects: [] });
        const estado = screen.getByLabelText(/pendiente/);
        expect(estado).toHaveAttribute('aria-label', expect.stringContaining('Sin vincular a minerva'));
        expect(estado).toHaveAttribute('aria-label', expect.stringContaining('Nunca ha iniciado sesión'));
        expect(estado).toHaveAttribute('aria-label', expect.stringContaining('Sin proyectos asignados'));
    });

    it('muestra la ultima sesion y avisa cuando no hay', () => {
        renderCard();
        expect(screen.getByText(/^Última sesión /)).toBeInTheDocument();
    });

    it('sin ultimo acceso lo dice en vez de inventar una fecha', () => {
        renderCard({ ultimo_acceso: null });
        expect(screen.getByText('Sin ingresar')).toBeInTheDocument();
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
