import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const reviewTable = vi.fn();
const createDrafts = vi.fn();
const readTableFile = vi.fn();
const fetchUnpublished = vi.fn();
const editDrafts = vi.fn();

vi.mock('@features/sextante/api/stylesBatchService', () => ({
    reviewTable: (...args) => reviewTable(...args),
    createDrafts: (...args) => createDrafts(...args),
    readTableFile: (...args) => readTableFile(...args),
    fetchUnpublished: (...args) => fetchUnpublished(...args),
    editDrafts: (...args) => editDrafts(...args),
    fetchHistory: vi.fn(() => Promise.resolve([])),
    discardDraft: vi.fn(),
    reapplyDraft: vi.fn(),
    fetchPreview: vi.fn(() => new Promise(() => {})),
    approveDraft: vi.fn(),
    batchErrorMessage: (err, fallback) => err?.message || fallback,
}));

vi.mock('@shared/contexts/useAuth', () => ({
    useAuth: () => ({ user: { permissions: ['mariachi.geoserver.manage'] } }),
}));

vi.mock('@shared/services/message', () => ({
    message: { error: vi.fn(), success: vi.fn() },
}));

import StylesBatchPage from '@features/sextante/pages/StylesBatchPage';

const row = (overrides = {}) => ({
    fila: 2,
    nombre: 'Homicidio doloso (tasa)',
    workspace: 'seguridad',
    alias: 'seguridad',
    layer_name: 'homicidio',
    attribute: 'tasa',
    unidades: 'tasa',
    paleta: 'S_ROJO_7_CRITICA',
    orientacion: 'Inferior',
    cortes_texto: '[0, 0, 1, 3]',
    cortes: [0, 0, 1, 3],
    colores: ['#111111', '#222222', '#333333'],
    labels: ['0', '0 a 1', '1 a 3'],
    errores: [],
    reemplaza: true,
    ...overrides,
});

const renderPage = () => render(<MemoryRouter><StylesBatchPage /></MemoryRouter>);

const pasteTable = (container) => {
    readTableFile.mockResolvedValue('capa,campo\nA,b');
    const input = container.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [new File(['x'], 'tabla.xlsx')] } });
};

const DRAFT = {
    id: 4,
    resource_id: 'seguridad:homicidio',
    actualizado_en: '2026-11-11T10:00:00Z',
    usuario: { name: 'Ana' },
    data: { style_title: 'Homicidio doloso', colors: ['#111111'] },
};

describe('StylesBatchPage', () => {
    beforeEach(() => {
        reviewTable.mockReset();
        createDrafts.mockReset();
        fetchUnpublished.mockResolvedValue([]);
        localStorage.clear();
    });

    it('blocks the next step while a row has errors', async () => {
        reviewTable.mockResolvedValue([row({ errores: ['La paleta «X» no existe'] })]);
        const { container } = renderPage();
        pasteTable(container);
        expect(await screen.findByText('La paleta «X» no existe')).toBeTruthy();
        expect(screen.getByTitle('+1')).toBeTruthy();
        expect(screen.getByRole('button', { name: /Ver cómo quedan/ }).disabled).toBe(true);
    });

    it('saves the drafts after the preview', async () => {
        reviewTable.mockResolvedValue([row()]);
        createDrafts.mockResolvedValue([
            { id: 9, resource_id: 'seguridad:homicidio', data: { colors: ['#111111'], style_title: 'Homicidio doloso (tasa)' } },
        ]);
        const { container } = renderPage();
        pasteTable(container);
        fireEvent.click(await screen.findByRole('button', { name: /Ver cómo quedan/ }));
        expect(await screen.findByText('Hoy en el visor')).toBeTruthy();
        expect(screen.getAllByText('Homicidio doloso (tasa)').length).toBeGreaterThan(1);
        fireEvent.click(screen.getByRole('button', { name: /Guardar 1 borradores/ }));
        await waitFor(() => expect(createDrafts).toHaveBeenCalledTimes(1));
        expect(createDrafts.mock.calls[0][0]).toContain('seguridad:homicidio');
        expect(await screen.findByText('1 borradores guardados')).toBeTruthy();
        expect(screen.getByText('Pendiente de aprobación')).toBeTruthy();
    });

    it('removes rows and keeps the batch after leaving the page', async () => {
        reviewTable.mockResolvedValue([row(), row({ fila: 3, nombre: 'Robo', errores: ['La capa no existe en GeoServer'] })]);
        const { container, unmount } = renderPage();
        pasteTable(container);
        expect(await screen.findByText('Robo')).toBeTruthy();
        unmount();
        renderPage();
        expect(await screen.findByText('Robo')).toBeTruthy();
        reviewTable.mockResolvedValue([row()]);
        fireEvent.click(screen.getByRole('button', { name: /Quitar 1 con error/ }));
        await waitFor(() => expect(screen.queryByText('Robo')).toBeNull());
        expect(reviewTable.mock.calls.at(-1)[0]).not.toContain('Robo');
    });

    it('edits an unpublished draft in place', async () => {
        fetchUnpublished.mockResolvedValue([DRAFT]);
        editDrafts.mockResolvedValue([row()]);
        createDrafts.mockResolvedValue([]);
        renderPage();
        fireEvent.click(await screen.findByRole('button', { name: 'Sin publicar (1)' }));
        expect(await screen.findByText('Homicidio doloso')).toBeTruthy();
        expect(screen.getByText(/Ana/)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Editar aquí' }));
        await waitFor(() => expect(editDrafts).toHaveBeenCalledWith([4]));
        fireEvent.click(await screen.findByRole('button', { name: 'Guardar' }));
        await waitFor(() => expect(createDrafts).toHaveBeenCalledTimes(1));
        expect(createDrafts.mock.calls[0][1]).toEqual([4]);
    });

    it('opens every unpublished draft in the batch review', async () => {
        fetchUnpublished.mockResolvedValue([DRAFT]);
        editDrafts.mockResolvedValue([row()]);
        createDrafts.mockResolvedValue([]);
        renderPage();
        fireEvent.click(await screen.findByRole('button', { name: 'Sin publicar (1)' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Editar los 1 en la revisión' }));
        fireEvent.click(await screen.findByRole('button', { name: /Ver cómo quedan/ }));
        fireEvent.click(await screen.findByRole('button', { name: /Actualizar 1 borradores/ }));
        await waitFor(() => expect(createDrafts).toHaveBeenCalledTimes(1));
        expect(createDrafts.mock.calls[0][1]).toEqual([4]);
    });
});
