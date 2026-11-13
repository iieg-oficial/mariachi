import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const inspectMosaicFolder = vi.fn();
const publishMosaic = vi.fn();

vi.mock('@features/sextante/api/mosaicService', () => ({
    inspectMosaicFolder: (...args) => inspectMosaicFolder(...args),
    publishMosaic: (...args) => publishMosaic(...args),
}));

vi.mock('@shared/services/message', () => ({
    message: { error: vi.fn(), success: vi.fn() },
}));

import PublishMosaicModal from '@features/sextante/components/PublishMosaicModal';

const PATH = 'geoserver-raster/lluvia/mensual';
const WORKSPACES = [{ alias: 'raster', geoserverWorkspace: 'raster' }];

const folder = (dates) => ({
    path: PATH,
    store: 'mensual',
    rasters: Object.keys(dates),
    has_properties: { indexer: false, timeregex: false },
    mosaic: null,
    formats: [
        { format: 'yyyy-MM-dd', example: 'capa_2025-06-01.tif', dates: Object.fromEntries(Object.keys(dates).map((n) => [n, null])) },
        { format: 'yyyy_MM', example: 'capa_2025_06.tif', dates },
    ],
    suggested_format: Object.values(dates).every(Boolean) ? 'yyyy_MM' : null,
});

const renderModal = () => render(
    <MemoryRouter>
        <PublishMosaicModal open path={PATH} workspaces={WORKSPACES} onClose={vi.fn()} />
    </MemoryRouter>,
);

describe('PublishMosaicModal', () => {
    beforeEach(() => {
        inspectMosaicFolder.mockReset();
        publishMosaic.mockReset();
    });

    it('muestra la fecha leida y publica con el formato sugerido', async () => {
        inspectMosaicFolder.mockResolvedValue(folder({
            'lluvia_2025_01.tif': '2025-01-01',
            'lluvia_2025_02.tif': '2025-02-01',
        }));
        publishMosaic.mockResolvedValue({
            workspace: 'raster', store: 'mensual', format: 'yyyy_MM',
            periods: 2, first: '2025-01-01', last: '2025-02-01', advertised: true,
        });
        renderModal();

        expect(await screen.findByText('2025-02-01')).toBeTruthy();
        expect(screen.getByText('2 de 2 archivo(s) con fecha')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Publicar' }));
        await waitFor(() => expect(publishMosaic).toHaveBeenCalledWith({
            workspace: 'raster', path: PATH, dateFormat: 'yyyy_MM',
        }));
        expect(await screen.findByText('La GetCapabilities anuncia TIME')).toBeTruthy();
    });

    it('no deja publicar si un archivo no trae fecha', async () => {
        inspectMosaicFolder.mockResolvedValue(folder({
            'lluvia_2025_01.tif': '2025-01-01',
            'lluvia_final.tif': null,
        }));
        renderModal();

        expect((await screen.findAllByText('✕ sin fecha')).length).toBeGreaterThan(0);
        expect(screen.getByRole('button', { name: 'Publicar' }).disabled).toBe(true);
    });
});
