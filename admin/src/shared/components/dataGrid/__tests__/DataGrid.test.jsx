/**
 * El grid es virtualizado: en happy-dom el contenedor mide 0 y no pinta filas,
 * asi que estos tests no verifican contenido sino que el montaje no explote.
 * Es la regresion que importa: con dos copias de react-dom en el bundle
 * (react 19 + una copia 18 anidada) el render revienta con
 * "Cannot read properties of undefined (reading 'ReactCurrentBatchConfig')".
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import DataGrid from '@shared/components/dataGrid/DataGrid';

const COLUMNS = [
    { key: 'layer_key', title: 'Capa', type: 'text', editable: false, sticky: true },
    { key: 'layer_name_usuario', title: 'Nombre', type: 'text' },
    { key: 'frecuencia', title: 'Frecuencia', type: 'select', optionsKey: 'frecuencia' },
    { key: 'downloadable', title: 'Descargable', type: 'bool' },
];

const ROWS = [
    { layer_key: 'ws:capa_a', layer_name_usuario: 'Capa A', frecuencia: 'Anual', downloadable: true },
    { layer_key: 'ws:capa_b', layer_name_usuario: 'Capa B', frecuencia: null, downloadable: false },
];

const CATALOGS = { frecuencia: [{ value: 'Anual', label: 'Anual' }] };

const renderGrid = (props = {}) => render(
    <DataGrid
        columnsMeta={COLUMNS}
        catalogs={CATALOGS}
        data={ROWS}
        draft={{}}
        rowKeyField="layer_key"
        onChange={() => {}}
        {...props}
    />,
);

beforeAll(() => {
    if (!window.ResizeObserver) {
        window.ResizeObserver = class {
            observe() {}
            unobserve() {}
            disconnect() {}
        };
    }
    if (!window.matchMedia) {
        window.matchMedia = vi.fn().mockImplementation((query) => ({
            matches: false,
            media: query,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        }));
    }
});

describe('DataGrid', () => {
    it('monta sin errores con la version de React del proyecto', () => {
        const { container } = renderGrid();
        expect(container.querySelector('.mariachi-grid')).toBeInTheDocument();
    });

    it('monta con celdas sucias, conflictos y presencia', () => {
        const { container } = renderGrid({
            draft: { 'ws:capa_a': { layer_name_usuario: 'Editado' } },
            conflicts: [{ rowKey: 'ws:capa_b', column: 'frecuencia' }],
            presenceByRow: { 'ws:capa_a': [{ username: 'ana', name: 'Ana Ruiz' }] },
        });
        expect(container.querySelector('.mariachi-grid')).toBeInTheDocument();
    });

    it('monta sin columnas ni filas', () => {
        const { container } = renderGrid({ columnsMeta: [], data: [] });
        expect(container.querySelector('.mariachi-grid')).toBeInTheDocument();
    });
});
