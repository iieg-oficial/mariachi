import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const reviewTable = vi.fn();
const createDrafts = vi.fn();

vi.mock('@features/mapalab-layers/services/stylesBatchService', () => ({
    reviewTable: (...args) => reviewTable(...args),
    createDrafts: (...args) => createDrafts(...args),
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

import StylesBatchPage from '@features/mapalab-layers/pages/StylesBatchPage';

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

const pasteTable = () => {
    fireEvent.change(screen.getByPlaceholderText(/pégalas aquí/), { target: { value: 'capa,campo\nA,b' } });
    fireEvent.click(screen.getByRole('button', { name: /Revisar tabla/ }));
};

describe('StylesBatchPage', () => {
    beforeEach(() => {
        reviewTable.mockReset();
        createDrafts.mockReset();
    });

    it('blocks the next step while a row has errors', async () => {
        reviewTable.mockResolvedValue([row({ errores: ['La paleta «X» no existe'] })]);
        renderPage();
        pasteTable();
        expect(await screen.findByText('La paleta «X» no existe')).toBeTruthy();
        expect(screen.getByText('1 por corregir')).toBeTruthy();
        expect(screen.getByRole('button', { name: /Ver cómo quedan/ }).disabled).toBe(true);
    });

    it('saves the drafts after the preview', async () => {
        reviewTable.mockResolvedValue([row()]);
        createDrafts.mockResolvedValue([
            { id: 9, resource_id: 'seguridad:homicidio', data: { colors: ['#111111'], style_title: 'Homicidio doloso (tasa)' } },
        ]);
        renderPage();
        pasteTable();
        fireEvent.click(await screen.findByRole('button', { name: /Ver cómo quedan/ }));
        expect(await screen.findByRole('button', { name: /Comparar/ })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /Guardar 1 borradores/ }));
        await waitFor(() => expect(createDrafts).toHaveBeenCalledTimes(1));
        expect(createDrafts.mock.calls[0][0]).toContain('seguridad:homicidio');
        expect(await screen.findByText('1 borradores guardados')).toBeTruthy();
        expect(screen.getByText('Pendiente de aprobación')).toBeTruthy();
    });
});
