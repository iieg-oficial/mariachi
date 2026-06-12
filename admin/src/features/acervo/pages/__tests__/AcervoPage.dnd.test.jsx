import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AcervoPage from '@features/acervo/pages/AcervoPage';

vi.mock('@shared/hooks/useIsMobile', () => ({
    default: () => ({ isMobile: false }),
}));

vi.mock('@features/acervo/api/acervoService', () => ({
    default: {
        getBuckets: vi.fn(),
        getAcervoFiles: vi.fn(),
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
        acervoService.getAcervoFiles.mockResolvedValue([]);
        acervoService.getFolders.mockResolvedValue([]);
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
