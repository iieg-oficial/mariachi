import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AcervoPage from '@features/acervo/pages/AcervoPage';

vi.mock('@shared/hooks/useIsMobile', () => ({
    default: () => ({ isMobile: false }),
}));

const { mockGetAcervoFiles, esPrevisualizableMock } = vi.hoisted(() => ({
    mockGetAcervoFiles: vi.fn(),
    esPrevisualizableMock: (file) => Boolean(file?.url)
        && !file?.isDir
        && (file?.type || '').startsWith('image/'),
}));

vi.mock('@features/acervo/api/acervoService', () => ({
    ACERVO_PAGE_SIZE: 100,
    getAcervoFiles: mockGetAcervoFiles,
    esPrevisualizable: esPrevisualizableMock,
    toPublicUrl: (url) => url,
    default: {
        getBuckets: vi.fn(),
        getAcervoFiles: mockGetAcervoFiles,
        toPublicUrl: (url) => url,
        esPrevisualizable: esPrevisualizableMock,
        getFolders: vi.fn(),
        uploadAcervoFile: vi.fn(),
        initChunkedUpload: vi.fn(),
        uploadChunk: vi.fn(),
        completeChunkedUpload: vi.fn(),
        updateAcervoFile: vi.fn(),
        moveAcervoFile: vi.fn(),
        deleteAcervoFile: vi.fn(),
        deleteMultipleFiles: vi.fn(),
        createFolder: vi.fn(),
        deleteFolder: vi.fn(),
        getFolderInfo: vi.fn(),
        getAcervoResumen: vi.fn(),
        buildFolderZipUrl: vi.fn(() => '#'),
        formatFileSize: (bytes) => `${bytes} B`,
    },
}));

import acervoService from '@features/acervo/api/acervoService';

const BUCKET = { id: 6, acervo_bucket: 'iieg', display_name: 'IIEG', is_public: true };

const mkFile = (name) => new File(['contenido'], name, { type: 'image/svg+xml' });

describe('AcervoPage drag & drop', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        acervoService.getBuckets.mockResolvedValue([BUCKET]);
        acervoService.getAcervoFiles.mockResolvedValue({ items: [], total: 0, limit: 100, offset: 0, hasMore: false });
        acervoService.getFolders.mockResolvedValue([]);
        acervoService.getAcervoResumen.mockResolvedValue({ buckets: [], totals: {} });
        acervoService.uploadAcervoFile.mockResolvedValue({ id: 1 });
    });

    it('soltar varios archivos sobre la rejilla dispara una subida por archivo', async () => {
        render(<AcervoPage />);
        const zone = await screen.findByTestId('acervo-drop-zone');
        await waitFor(() => expect(acervoService.getBuckets).toHaveBeenCalled());
        await waitFor(() => expect(acervoService.getAcervoFiles).toHaveBeenCalled());

        const files = [mkFile('a.svg'), mkFile('b.svg'), mkFile('c.svg')];
        fireEvent.drop(zone, {
            dataTransfer: { files, items: [], types: ['Files'] },
        });

        await waitFor(() => expect(acervoService.uploadAcervoFile).toHaveBeenCalledTimes(3));
        const folders = acervoService.uploadAcervoFile.mock.calls.map(([, opts]) => opts.folder);
        expect(folders).toEqual(['/', '/', '/']);
    });

    it('drop con dataTransfer.items como fallback (files vacio)', async () => {
        render(<AcervoPage />);
        const zone = await screen.findByTestId('acervo-drop-zone');
        await waitFor(() => expect(acervoService.getAcervoFiles).toHaveBeenCalled());

        const items = [mkFile('x.svg'), mkFile('y.svg')].map((f) => ({
            kind: 'file',
            getAsFile: () => f,
        }));
        fireEvent.drop(zone, {
            dataTransfer: { files: [], items, types: ['Files'] },
        });

        await waitFor(() => expect(acervoService.uploadAcervoFile).toHaveBeenCalledTimes(2));
    });

    it('archivo volátil (lectura falla) no se sube y no bloquea a los demás', async () => {
        render(<AcervoPage />);
        const zone = await screen.findByTestId('acervo-drop-zone');
        await waitFor(() => expect(acervoService.getAcervoFiles).toHaveBeenCalled());

        const volatil = mkFile('caduco.svg');
        volatil.arrayBuffer = () => Promise.reject(new DOMException('not found', 'NotFoundError'));
        const files = [volatil, mkFile('sano.svg')];
        fireEvent.drop(zone, {
            dataTransfer: { files, items: [], types: ['Files'] },
        });

        await waitFor(() => expect(acervoService.uploadAcervoFile).toHaveBeenCalledTimes(1));
        const [uploaded] = acervoService.uploadAcervoFile.mock.calls[0];
        expect(uploaded.name).toBe('sano.svg');
    });

    it('lote completamente ilegible deshabilita la zona de arrastre (persistido)', async () => {
        render(<AcervoPage />);
        const zone = await screen.findByTestId('acervo-drop-zone');
        await waitFor(() => expect(acervoService.getAcervoFiles).toHaveBeenCalled());

        const files = [mkFile('a.svg'), mkFile('b.svg')];
        files.forEach((f) => {
            f.arrayBuffer = () => Promise.reject(new DOMException('not found', 'NotFoundError'));
        });
        fireEvent.drop(zone, { dataTransfer: { files, items: [], types: ['Files'] } });

        await waitFor(() => expect(localStorage.getItem('mariachi.acervo.dndUnsupported')).toBe('1'));
        expect(acervoService.uploadAcervoFile).not.toHaveBeenCalled();

        fireEvent.dragEnter(zone, { dataTransfer: { types: ['Files'] } });
        expect(screen.queryByText(/Suelta para subir/)).toBeNull();
    });

    it('un drop legible re-habilita la zona de arrastre', async () => {
        localStorage.setItem('mariachi.acervo.dndUnsupported', '1');
        render(<AcervoPage />);
        const zone = await screen.findByTestId('acervo-drop-zone');
        await waitFor(() => expect(acervoService.getAcervoFiles).toHaveBeenCalled());

        fireEvent.drop(zone, {
            dataTransfer: { files: [mkFile('ok.svg')], items: [], types: ['Files'] },
        });

        await waitFor(() => expect(acervoService.uploadAcervoFile).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(localStorage.getItem('mariachi.acervo.dndUnsupported')).toBe('0'));
    });

    it('drop sin archivos no dispara subidas', async () => {
        render(<AcervoPage />);
        const zone = await screen.findByTestId('acervo-drop-zone');
        await waitFor(() => expect(acervoService.getAcervoFiles).toHaveBeenCalled());

        fireEvent.drop(zone, {
            dataTransfer: { files: [], items: [], types: ['text/uri-list'] },
        });

        await new Promise((r) => setTimeout(r, 50));
        expect(acervoService.uploadAcervoFile).not.toHaveBeenCalled();
    });
});
