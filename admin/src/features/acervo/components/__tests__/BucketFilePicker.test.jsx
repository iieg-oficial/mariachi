import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import BucketFilePicker from '@features/acervo/components/BucketFilePicker';

vi.mock('@features/acervo/api/acervoService', () => ({
    ACERVO_PAGE_SIZE: 100,
    getAcervoFiles: vi.fn(),
    getBuckets: vi.fn(() => Promise.resolve([])),
    formatFileSize: (bytes) => `${bytes} B`,
}));

const pagina = (items, hasMore = false) => ({
    items,
    total: items.length,
    limit: 100,
    offset: 0,
    hasMore,
});

import { getAcervoFiles } from '@features/acervo/api/acervoService';

const SAMPLE_FILES = [
    {
        name: 'fotos/perfil.jpg',
        originalName: 'perfil.jpg',
        isDir: false,
        url: 'https://acervo.example.com/portal-bucket/fotos/perfil.jpg',
    },
    {
        name: 'docs/informe.pdf',
        originalName: 'informe.pdf',
        isDir: false,
        url: 'https://acervo.example.com/portal-bucket/docs/informe.pdf',
    },
    {
        name: 'banners/header.webp',
        originalName: 'header.webp',
        isDir: false,
        url: 'https://acervo.example.com/portal-bucket/banners/header.webp',
    },
];

const FOLDER_RECORD = {
    name: 'envios/',
    originalName: 'envios',
    isDir: true,
    size: 350,
    uploadedAt: '2026-06-12T12:00:00+00:00',
};
const FOLDER_DATE = new Date(FOLDER_RECORD.uploadedAt).toLocaleDateString('es-MX');

describe('BucketFilePicker', () => {
    beforeEach(() => {
        getAcervoFiles.mockReset();
        getAcervoFiles.mockResolvedValue(pagina(SAMPLE_FILES));
    });

    it('no llama a getAcervoFiles cuando open=false', () => {
        render(
            <BucketFilePicker
                open={false}
                onClose={vi.fn()}
                onSelect={vi.fn()}
                bucketId={1}
            />,
        );
        expect(getAcervoFiles).not.toHaveBeenCalled();
    });

    it('lista los archivos del bucket cuando open=true', async () => {
        render(
            <BucketFilePicker
                open
                onClose={vi.fn()}
                onSelect={vi.fn()}
                bucketId={1}
            />,
        );
        await waitFor(() => {
            expect(getAcervoFiles).toHaveBeenCalledWith({
                bucketId: 1,
                folder: undefined,
                type: undefined,
                search: undefined,
                recursive: false,
                limit: 100,
                offset: 0,
            });
        });
        expect(await screen.findByText('perfil.jpg')).toBeInTheDocument();
        expect(screen.getByText('informe.pdf')).toBeInTheDocument();
        expect(screen.getByText('header.webp')).toBeInTheDocument();
    });

    it('click en una fila llama onSelect con {nombre, enlace, url, bucketId} y cierra', async () => {
        const onSelect = vi.fn();
        const onClose = vi.fn();
        render(
            <BucketFilePicker
                open
                onClose={onClose}
                onSelect={onSelect}
                bucketId={1}
            />,
        );
        const row = await screen.findByText('perfil.jpg');
        fireEvent.click(row);
        expect(onSelect).toHaveBeenCalledWith({
            nombre: 'perfil.jpg',
            enlace: '/fotos/perfil.jpg',
            url: 'https://acervo.example.com/portal-bucket/fotos/perfil.jpg',
            bucketId: 1,
        });
        expect(onClose).toHaveBeenCalled();
    });

    it('las carpetas muestran peso y fecha agregados en la vista de lista', async () => {
        getAcervoFiles.mockResolvedValue(pagina([FOLDER_RECORD]));
        render(
            <BucketFilePicker
                open
                mode="list"
                onClose={vi.fn()}
                onSelect={vi.fn()}
                bucketId={1}
            />,
        );
        expect(await screen.findByText('350 B')).toBeInTheDocument();
        expect(screen.getByText(FOLDER_DATE)).toBeInTheDocument();
    });

    it('las carpetas muestran peso y fecha agregados en las cards', async () => {
        getAcervoFiles.mockResolvedValue(pagina([FOLDER_RECORD]));
        render(
            <BucketFilePicker
                open
                mode="grid"
                onClose={vi.fn()}
                onSelect={vi.fn()}
                bucketId={1}
            />,
        );
        expect(await screen.findByText(`350 B · ${FOLDER_DATE}`)).toBeInTheDocument();
    });

    it('la búsqueda refetcha con search y recursive=true', async () => {
        render(
            <BucketFilePicker
                open
                onClose={vi.fn()}
                onSelect={vi.fn()}
                bucketId={1}
            />,
        );
        await screen.findByText('perfil.jpg');

        const search = screen.getByPlaceholderText('Buscar por nombre');
        fireEvent.change(search, { target: { value: 'perfil' } });

        await waitFor(() => {
            expect(getAcervoFiles).toHaveBeenCalledWith({
                bucketId: 1,
                folder: undefined,
                type: undefined,
                search: 'perfil',
                recursive: true,
                limit: 100,
                offset: 0,
            });
        });
    });

    it('pide la siguiente pagina con el offset acumulado', async () => {
        getAcervoFiles.mockResolvedValue({ ...pagina(SAMPLE_FILES, true), total: 6 });
        render(
            <BucketFilePicker
                open
                onClose={vi.fn()}
                onSelect={vi.fn()}
                bucketId={1}
            />,
        );
        await screen.findByText('perfil.jpg');
        expect(screen.getByText('3 de 6 elementos')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Cargar más' }));

        await waitFor(() => {
            expect(getAcervoFiles).toHaveBeenCalledWith(
                expect.objectContaining({ offset: 3, limit: 100 }),
            );
        });
    });
});
