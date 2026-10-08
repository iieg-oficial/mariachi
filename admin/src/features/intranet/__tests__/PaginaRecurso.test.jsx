import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const permisos = { actuales: new Set() };

vi.mock('@shared/contexts/useAuth', () => ({
    useAuth: () => ({ can: (permiso) => permisos.actuales.has(permiso) }),
}));

vi.mock('../api/intranetService', () => ({
    listar: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    eliminar: vi.fn(),
    revisar: vi.fn(),
    aFormData: (valores) => valores,
    urlArchivo: () => null,
}));

import { listar } from '../api/intranetService';
import CarruselPage from '../pages/CarruselPage';
import EnlacesPage from '../pages/EnlacesPage';

const ENLACES = [{ id: 1, seccion: 'IIEG', etiqueta: 'Transparencia', url: null, icono: 'shield', orden: 1 }];
const CARRUSEL = [
    { id: 5, name: 'Aviso', title: 'Propuesto', status: 'pendiente', active: true, order: 0 },
    { id: 6, name: 'Otro', title: 'Al aire', status: 'aprobado', active: true, order: 1 },
];

beforeEach(() => {
    vi.clearAllMocks();
    permisos.actuales = new Set();
});

describe('páginas de intranet', () => {
    it('solo con vista: muestra la tabla sin alta ni acciones', async () => {
        listar.mockResolvedValue(ENLACES);
        render(<EnlacesPage />);
        await waitFor(() => expect(screen.getByText('Transparencia')).toBeTruthy());
        expect(listar).toHaveBeenCalledWith('enlaces');
        expect(screen.queryByText('Nuevo enlace')).toBeNull();
        expect(screen.queryByLabelText('Eliminar enlace')).toBeNull();
    });

    it('con el permiso de administrar: alta, edición y borrado', async () => {
        permisos.actuales = new Set(['mariachi.intranet.manage']);
        listar.mockResolvedValue(ENLACES);
        render(<EnlacesPage />);
        await waitFor(() => expect(screen.getByText('Transparencia')).toBeTruthy());
        expect(screen.getByText('Nuevo enlace')).toBeTruthy();
        expect(screen.getByLabelText('Editar enlace')).toBeTruthy();
        expect(screen.getByLabelText('Eliminar enlace')).toBeTruthy();
    });

    it('el carrusel ofrece publicar o rechazar solo en lo pendiente', async () => {
        permisos.actuales = new Set(['mariachi.intranet.manage']);
        listar.mockResolvedValue(CARRUSEL);
        render(<CarruselPage />);
        await waitFor(() => expect(screen.getByText('Propuesto')).toBeTruthy());
        expect(screen.getByText('Pendiente')).toBeTruthy();
        expect(screen.getByText('Publicado')).toBeTruthy();
        expect(screen.getAllByLabelText('Publicar elemento')).toHaveLength(1);
        expect(screen.getAllByLabelText('Rechazar elemento')).toHaveLength(1);
    });

    it('si la intranet no responde la página sigue en pie', async () => {
        listar.mockRejectedValue({ response: { data: { detail: 'La intranet no está disponible' } } });
        render(<EnlacesPage />);
        await waitFor(() => expect(screen.getByText('Todavía no hay enlaces en el pie de página')).toBeTruthy());
    });
});
