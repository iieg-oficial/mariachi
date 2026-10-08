import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

vi.mock('@shared/contexts/useAuth', () => ({ useAuth: () => ({ can: () => true }) }));

vi.mock('../api/intranetService', () => ({
    listar: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    eliminar: vi.fn(),
    aFormData: (valores) => valores,
}));

import { listar } from '../api/intranetService';
import DocumentosPage from '../pages/DocumentosPage';

const CARPETAS = [{ id: 1, nombre: 'Normativa', descripcion: null, orden: 1 }, { id: 2, nombre: 'Formatos', descripcion: null, orden: 2 }];
const DOCUMENTOS = [
    { id: 10, title: 'Reglamento interno', file_name: 'r.pdf', file_size: 1048576, carpeta_id: 1, order: 1 },
    { id: 11, title: 'Solicitud de vacaciones', file_name: 'v.docx', file_size: 2048, carpeta_id: 2, order: 1 },
    { id: 12, title: 'Directorio viejo', file_name: 'd.xlsx', file_size: 4096, carpeta_id: null, order: 1 },
];

beforeEach(() => {
    listar.mockImplementation(async (recurso) => (recurso === 'carpetas' ? CARPETAS : DOCUMENTOS));
});

describe('DocumentosPage', () => {
    it('carpetas y archivos en la misma vista, sin selector', async () => {
        render(<DocumentosPage />);
        expect(await screen.findByText('Reglamento interno')).toBeInTheDocument();
        expect(screen.queryByText('Solicitud de vacaciones')).not.toBeInTheDocument();
        fireEvent.click(screen.getByText('Formatos'));
        expect(await screen.findByText('Solicitud de vacaciones')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Sin carpeta · 1/ }));
        expect(await screen.findByText('Directorio viejo')).toBeInTheDocument();
        expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    });

    it('agregar ofrece archivo o carpeta, y editar precarga', async () => {
        render(<DocumentosPage />);
        await screen.findByText('Reglamento interno');
        fireEvent.click(screen.getByRole('button', { name: /Agregar/ }));
        expect(await screen.findByText('Archivo', { selector: '.ant-dropdown-menu-title-content' })).toBeInTheDocument();
        expect(screen.getByText('Carpeta', { selector: '.ant-dropdown-menu-title-content' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Editar el documento' }));
        const modal = await screen.findByRole('dialog');
        await waitFor(() => expect(within(modal).getByDisplayValue('Reglamento interno')).toBeInTheDocument());
    });
});
