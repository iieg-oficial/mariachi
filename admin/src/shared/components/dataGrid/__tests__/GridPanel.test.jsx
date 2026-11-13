import { useState } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GridPanel from '@shared/components/dataGrid/GridPanel';

const fetchGridRows = vi.fn();

vi.mock('@shared/services/gridService', () => ({
    fetchGridRows: (...args) => fetchGridRows(...args),
    patchGridCells: vi.fn(),
    fetchGridHistory: vi.fn(),
    fetchGridLastChanges: vi.fn(() => Promise.resolve([])),
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
    it('Ctrl+F pone el cursor en el buscador de la píldora', async () => {
        render(<Host />);
        const input = await screen.findByLabelText('Buscar en la tabla');

        fireEvent.keyDown(window, { key: 'f', ctrlKey: true });

        await waitFor(() => expect(document.activeElement).toBe(input));
    });

    it('Ctrl+G abre el selector de columna', async () => {
        render(<Host />);
        await screen.findByLabelText('Buscar en la tabla');

        fireEvent.keyDown(window, { key: 'g', ctrlKey: true });

        expect(await screen.findByText('Ir a la columna…')).toBeTruthy();
    });

    it('Ctrl+F evita que el navegador abra su propio buscador', async () => {
        render(<Host />);
        await screen.findByLabelText('Buscar en la tabla');

        expect(dispatchKey('f', { ctrlKey: true }).defaultPrevented).toBe(true);
    });

    it('Ctrl+Shift+F abre el filtro por workspace', async () => {
        render(<Host />);
        await screen.findByLabelText('Buscar en la tabla');

        fireEvent.keyDown(window, { key: 'f', ctrlKey: true, shiftKey: true });

        expect(await screen.findByText('Todos los workspaces')).toBeTruthy();
    });

    it('Ctrl+Z sigue deshaciendo', async () => {
        render(<Host />);
        await screen.findByLabelText('Buscar en la tabla');

        expect(dispatchKey('z', { ctrlKey: true }).defaultPrevented).toBe(true);
    });

    it('una tecla sin Ctrl no se intercepta', async () => {
        render(<Host />);
        await screen.findByLabelText('Buscar en la tabla');

        expect(dispatchKey('f').defaultPrevented).toBe(false);
    });
});
