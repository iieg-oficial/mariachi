import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GridHistoryDrawer from '@shared/components/dataGrid/GridHistoryDrawer';

const fetchGridHistory = vi.fn();
const downloadCsv = vi.fn();

vi.mock('@shared/services/gridService', () => ({
    fetchGridHistory: (...args) => fetchGridHistory(...args),
}));

vi.mock('@shared/helpers/downloadFile', () => ({
    downloadCsv: (...args) => downloadCsv(...args),
}));

const ENTRY = {
    row_key: 'salud:unidades_salud',
    column_key: 'descripcion',
    from_value: 'antes',
    to_value: 'después',
    changed_by: 'edgar@iieg.gob.mx',
    changed_at: '2026-09-01T10:00:00Z',
    source: 'formulario',
};

const RESOURCES = [
    { value: 'layer-config', label: 'Capas', columnsMeta: [{ key: 'label', title: 'Nombre' }] },
    { value: 'layer-metadata', label: 'Metadatos', columnsMeta: [{ key: 'descripcion', title: 'Descripción' }] },
];

describe('GridHistoryDrawer', () => {
    beforeEach(() => {
        fetchGridHistory.mockReset();
        downloadCsv.mockReset();
    });

    it('baja el historial que se muestra, con la rejilla y la capa por columna', async () => {
        fetchGridHistory.mockImplementation((resource) => Promise.resolve(
            resource === 'layer-metadata' ? [ENTRY] : [],
        ));

        render(<GridHistoryDrawer open onClose={() => {}} resources={RESOURCES} />);

        const boton = await screen.findByRole('button', { name: /descargar/i });
        await waitFor(() => expect(boton).not.toBeDisabled());
        fireEvent.click(boton);

        expect(downloadCsv).toHaveBeenCalledTimes(1);
        const [headers, body, filename] = downloadCsv.mock.calls[0];
        expect(headers).toEqual([
            'Rejilla', 'Capa', 'Campo', 'Valor anterior', 'Valor nuevo', 'Responsable', 'Fecha', 'Origen',
        ]);
        expect(body).toHaveLength(1);
        expect(body[0][0]).toBe('Metadatos');
        expect(body[0][1]).toBe('salud:unidades_salud');
        expect(body[0][2]).toBe('Descripción');
        expect(body[0][3]).toBe('antes');
        expect(body[0][4]).toBe('después');
        expect(body[0][5]).toBe('edgar@iieg.gob.mx');
        expect(body[0][7]).toBe('Ficha');
        expect(filename).toMatch(/^historial-\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it('omite la columna Capa y nombra el archivo con la fila cuando el alcance es una sola capa', async () => {
        fetchGridHistory.mockResolvedValue([ENTRY]);

        render(
            <GridHistoryDrawer
                open
                onClose={() => {}}
                resource="layer-metadata"
                columnsMeta={[{ key: 'descripcion', title: 'Descripción' }]}
                rowKey="salud:unidades_salud"
            />,
        );

        const boton = await screen.findByRole('button', { name: /descargar/i });
        await waitFor(() => expect(boton).not.toBeDisabled());
        fireEvent.click(boton);

        const [headers, body, filename] = downloadCsv.mock.calls[0];
        expect(headers).toEqual([
            'Campo', 'Valor anterior', 'Valor nuevo', 'Responsable', 'Fecha', 'Origen',
        ]);
        expect(body[0][0]).toBe('Descripción');
        expect(filename).toMatch(/^historial-salud-unidades_salud-\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it('deja el botón inhabilitado cuando no hay cambios registrados', async () => {
        fetchGridHistory.mockResolvedValue([]);

        render(<GridHistoryDrawer open onClose={() => {}} resource="layer-metadata" />);

        const boton = await screen.findByRole('button', { name: /descargar/i });
        await waitFor(() => expect(boton).toBeDisabled());
        expect(downloadCsv).not.toHaveBeenCalled();
    });
});
