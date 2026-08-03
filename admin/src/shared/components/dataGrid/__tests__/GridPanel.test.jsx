import { useState } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import GridPanel from '@shared/components/dataGrid/GridPanel';

const fetchGridRows = vi.fn();

vi.mock('@shared/services/gridService', () => ({
    fetchGridRows: (...args) => fetchGridRows(...args),
    patchGridCells: vi.fn(),
    fetchGridHistory: vi.fn(),
    exportGrid: vi.fn(),
    fetchGridPresence: vi.fn(() => Promise.resolve({})),
    registerGridPresence: vi.fn(),
    clearGridPresence: vi.fn(),
}));

const ROWS = {
    columns: [
        { key: 'id', title: 'ID', type: 'text', sticky: true },
        { key: 'label', title: 'Nombre', type: 'text' },
    ],
    rows: [
        { id: 'salud-hospitales', label: 'Hospitales', workspace_alias: 'salud' },
        { id: 'educacion-escuelas', label: 'Escuelas', workspace_alias: 'educacion' },
    ],
};

function Host() {
    const [toolbar, setToolbar] = useState(null);
    return (
        <>
            <div data-testid="toolbar">{toolbar}</div>
            <GridPanel
                resource="layer-config"
                rowKeyField="id"
                catalogs={{}}
                filterField="workspace_alias"
                filterLabel="Workspace"
                filterAllLabel="Todos los workspaces"
                searchFields={['id', 'label']}
                searchPlaceholder="Buscar capa"
                itemsLabel="nodos"
                exportFileName="config"
                rowLabelField="label"
                onToolbarChange={setToolbar}
            />
        </>
    );
}

const dispatchKey = (key, options = {}) => {
    const event = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
        ...options,
    });
    window.dispatchEvent(event);
    return event;
};

beforeAll(() => {
    if (!window.ResizeObserver) {
        window.ResizeObserver = class {
            observe() {}
            unobserve() {}
            disconnect() {}
        };
    }
});

beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    fetchGridRows.mockResolvedValue(ROWS);
});

describe('GridPanel · atajos de teclado', () => {
    it('Ctrl+F abre el buscador de la tabla', async () => {
        render(<Host />);
        await screen.findByTitle('Buscar');
        expect(screen.queryByPlaceholderText('Buscar capa')).toBeNull();

        fireEvent.keyDown(window, { key: 'f', ctrlKey: true });

        expect(await screen.findByPlaceholderText('Buscar capa')).toBeTruthy();
    });

    it('Ctrl+F evita que el navegador abra su propio buscador', async () => {
        render(<Host />);
        await screen.findByTitle('Buscar');

        expect(dispatchKey('f', { ctrlKey: true }).defaultPrevented).toBe(true);
    });

    it('Ctrl+Shift+F abre el filtro por workspace', async () => {
        render(<Host />);
        await screen.findByTitle('Buscar');

        fireEvent.keyDown(window, { key: 'f', ctrlKey: true, shiftKey: true });

        expect(await screen.findByText('Todos los workspaces')).toBeTruthy();
        expect(screen.queryByPlaceholderText('Buscar capa')).toBeNull();
    });

    it('Ctrl+Z sigue deshaciendo', async () => {
        render(<Host />);
        await screen.findByTitle('Buscar');

        expect(dispatchKey('z', { ctrlKey: true }).defaultPrevented).toBe(true);
    });

    it('una tecla sin Ctrl no se intercepta', async () => {
        render(<Host />);
        await screen.findByTitle('Buscar');

        expect(dispatchKey('f').defaultPrevented).toBe(false);
    });
});
