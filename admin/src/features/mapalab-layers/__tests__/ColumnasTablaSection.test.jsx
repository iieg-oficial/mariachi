import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const getColumnas = vi.fn();
const saveColumnas = vi.fn();

vi.mock('@features/mapalab-layers/api/columnasTablaService', () => ({
    getColumnas: (...args) => getColumnas(...args),
    saveColumnas: (...args) => saveColumnas(...args),
}));

const ColumnasTablaSection = (await import(
    '@features/mapalab-layers/components/layersEditor/ColumnasTablaSection'
)).default;

const CAMPOS = [
    { name: 'cve_mun', type: 'string' },
    { name: 'p_total', type: 'integer' },
    { name: 'geom', type: 'geometry' },
];

describe('ColumnasTablaSection', () => {
    beforeEach(() => {
        getColumnas.mockReset();
        saveColumnas.mockReset().mockResolvedValue([]);
    });

    it('descarta la geometria y ordena por la configuracion guardada', async () => {
        getColumnas.mockResolvedValue([
            { columna: 'p_total', alias: 'Población', orden: 0, visible: true, formato: 'entero' },
            { columna: 'cve_mun', alias: 'Municipio', orden: 1, visible: false, formato: null },
        ]);

        render(<ColumnasTablaSection layerKey="salud:hospitales" availableFields={CAMPOS} />);

        await waitFor(() => expect(screen.getByText('p_total')).toBeInTheDocument());
        expect(screen.queryByText('geom')).not.toBeInTheDocument();

        const filas = screen.getAllByRole('row').slice(1);
        expect(filas[0]).toHaveTextContent('p_total');
        expect(filas[1]).toHaveTextContent('cve_mun');
    });

    it('marca las columnas guardadas que la capa ya no tiene', async () => {
        getColumnas.mockResolvedValue([
            { columna: 'columna_vieja', alias: 'Vieja', orden: 0, visible: true, formato: null },
        ]);

        render(<ColumnasTablaSection layerKey="salud:hospitales" availableFields={CAMPOS} />);

        await waitFor(() => expect(screen.getByText('columna_vieja')).toBeInTheDocument());
        expect(screen.getByText('ya no existe en la capa')).toBeInTheDocument();
    });

    it('guarda el orden de la tabla y convierte el alias vacio en null', async () => {
        getColumnas.mockResolvedValue([]);

        render(<ColumnasTablaSection layerKey="salud:hospitales" availableFields={CAMPOS} />);
        await waitFor(() => expect(screen.getByText('cve_mun')).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', { name: 'Guardar columnas' }));

        await waitFor(() => expect(saveColumnas).toHaveBeenCalled());
        const [layerKey, columnas] = saveColumnas.mock.calls[0];
        expect(layerKey).toBe('salud:hospitales');
        expect(columnas).toEqual([
            { columna: 'cve_mun', alias: null, orden: 0, visible: true, formato: null },
            { columna: 'p_total', alias: null, orden: 1, visible: true, formato: null },
        ]);
    });
});
