import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GridDownloadsCard from '@shared/components/dataGrid/GridDownloadsCard';

const exportGrid = vi.fn();
const triggerDownload = vi.fn();

vi.mock('@shared/services/gridService', () => ({
    exportGrid: (...args) => exportGrid(...args),
}));

vi.mock('@shared/helpers/downloadFile', () => ({
    triggerDownload: (...args) => triggerDownload(...args),
}));

const RESOURCES = [
    { value: 'layer-metadata', label: 'Metadatos', fileName: 'mapalab-metadatos' },
    { value: 'layer-config', label: 'Capas', fileName: 'mapalab-capas' },
];

describe('GridDownloadsCard', () => {
    beforeEach(() => {
        exportGrid.mockReset();
        exportGrid.mockResolvedValue({ data: new Blob(), headers: {} });
        triggerDownload.mockReset();
    });

    it('pide el Excel de la primera rejilla sin separar hoja', async () => {
        render(<GridDownloadsCard resources={RESOURCES} />);

        fireEvent.click(screen.getByRole('button', { name: /excel/i }));

        await waitFor(() => expect(exportGrid).toHaveBeenCalledTimes(1));
        expect(exportGrid.mock.calls[0][0]).toBe('layer-metadata');
        expect(exportGrid.mock.calls[0][1]).toMatchObject({ formato: 'xlsx', hoja: null });
        await waitFor(() => expect(triggerDownload).toHaveBeenCalledWith(
            expect.anything(),
            'mapalab-metadatos.xlsx',
        ));
    });

    it('separa la hoja de historial cuando se pide en CSV', async () => {
        render(<GridDownloadsCard resources={RESOURCES} />);

        fireEvent.click(screen.getByRole('button', { name: /csv de historial/i }));

        await waitFor(() => expect(exportGrid).toHaveBeenCalledTimes(1));
        expect(exportGrid.mock.calls[0][1]).toMatchObject({ formato: 'csv', hoja: 'historial' });
    });

    it('cambia de rejilla con el selector', async () => {
        render(<GridDownloadsCard resources={RESOURCES} />);

        fireEvent.click(screen.getByText('Capas'));
        fireEvent.click(screen.getByRole('button', { name: /csv de datos/i }));

        await waitFor(() => expect(exportGrid).toHaveBeenCalledTimes(1));
        expect(exportGrid.mock.calls[0][0]).toBe('layer-config');
        expect(exportGrid.mock.calls[0][1]).toMatchObject({ formato: 'csv', hoja: 'metadatos' });
    });

    it('no renderiza nada si no le pasan rejillas', () => {
        const { container } = render(<GridDownloadsCard resources={[]} />);
        expect(container).toBeEmptyDOMElement();
    });
});
