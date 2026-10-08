import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const fetchGridRows = vi.fn();
const fetchGridPresence = vi.fn();

vi.mock('@shared/services/gridService', () => ({
    fetchGridRows: (...args) => fetchGridRows(...args),
    patchGridCells: vi.fn(),
    fetchGridHistory: vi.fn(),
    exportGrid: vi.fn(),
    fetchGridPresence: (...args) => fetchGridPresence(...args),
    registerGridPresence: vi.fn(),
    clearGridPresence: vi.fn(),
}));

const setHeader = vi.fn();

vi.mock('@app/fullscreenHeader', () => ({
    useFullscreenHeader: ({ extra }) => setHeader(extra),
    FullscreenHeaderContext: { Provider: ({ children }) => children },
}));

const ROWS_BY_RESOURCE = {
    'layer-metadata': {
        columns: [{ key: 'layer_key', title: 'Capa', type: 'text', sticky: true }],
        rows: [
            { layer_key: 'salud:hospitales', workspace: 'salud', descripcion: '' },
            {
                layer_key: 'salud:clinicas',
                workspace: 'salud',
                descripcion: 'Clínicas',
                has_dynamic_stats: true,
            },
        ],
    },
    'layer-config': {
        columns: [{ key: 'id', title: 'ID', type: 'text', sticky: true }],
        rows: [{ id: 'salud-hospitales', label: 'Hospitales', workspace_alias: 'salud' }],
    },
};

const importPage = async () => {
    const module = await import('@features/mapalab-layers/pages/MetadataGridPage');
    return module.default;
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
    fetchGridRows.mockImplementation((resource) =>
        Promise.resolve(ROWS_BY_RESOURCE[resource] || { columns: [], rows: [] }));
    fetchGridPresence.mockResolvedValue({});
});

describe('MetadataGridPage', () => {
    it('carga los dos recursos y muestra ambas pestañas', async () => {
        const MetadataGridPage = await importPage();
        render(<MetadataGridPage />);

        expect(await screen.findByRole('tab', { name: /Metadatos/ })).toBeTruthy();
        expect(screen.getByRole('tab', { name: /Configuración/ })).toBeTruthy();

        await waitFor(() => {
            const resources = fetchGridRows.mock.calls.map(([resource]) => resource);
            expect(resources).toContain('layer-metadata');
            expect(resources).toContain('layer-config');
        });
    });

    it('solo la pestaña activa registra presencia', async () => {
        const MetadataGridPage = await importPage();
        render(<MetadataGridPage />);

        await waitFor(() => expect(fetchGridPresence).toHaveBeenCalled());
        const resources = fetchGridPresence.mock.calls.map(([resource]) => resource);
        expect(resources).toContain('layer-metadata');
        expect(resources).not.toContain('layer-config');
    });

    it('al cambiar de pestaña la presencia pasa al otro recurso', async () => {
        const MetadataGridPage = await importPage();
        render(<MetadataGridPage />);

        fireEvent.click(await screen.findByRole('tab', { name: /Configuración/ }));

        await waitFor(() => {
            const resources = fetchGridPresence.mock.calls.map(([resource]) => resource);
            expect(resources).toContain('layer-config');
        });
    });

    it('muestra la barra de estado dentro de la barra de pestañas', async () => {
        const MetadataGridPage = await importPage();
        const { container } = render(<MetadataGridPage />);

        const estado = await screen.findByText('Todo guardado');
        expect(container.querySelector('.ant-tabs-extra-content')?.contains(estado)).toBe(true);
    });

    it('anuncia en la barra de estado las capas con numeralia dinámica', async () => {
        const MetadataGridPage = await importPage();
        render(<MetadataGridPage />);

        expect(await screen.findByText('1 con numeralia dinámica')).toBeTruthy();
    });

    it('publica una toolbar en el header fullscreen', async () => {
        const MetadataGridPage = await importPage();
        render(<MetadataGridPage />);

        await waitFor(() => {
            expect(setHeader.mock.calls.some(([extra]) => extra !== null)).toBe(true);
        });
    });
});
