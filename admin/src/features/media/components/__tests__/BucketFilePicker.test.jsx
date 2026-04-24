import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import BucketFilePicker from '@features/media/components/BucketFilePicker';

vi.mock('@features/media/api/mediaService', () => ({
    listBucketObjects: vi.fn(),
}));

import { listBucketObjects } from '@features/media/api/mediaService';

const SAMPLE_OBJECTS = [
    {
        name: 'fotos/perfil.jpg',
        size: 51200,
        last_modified: '2026-04-01T10:00:00Z',
        url: 'https://acervo.example.com/portal-bucket/fotos/perfil.jpg',
    },
    {
        name: 'docs/informe.pdf',
        size: 204800,
        last_modified: '2026-04-02T11:30:00Z',
        url: 'https://acervo.example.com/portal-bucket/docs/informe.pdf',
    },
    {
        name: 'banners/header.webp',
        size: 102400,
        last_modified: '2026-04-03T09:15:00Z',
        url: 'https://acervo.example.com/portal-bucket/banners/header.webp',
    },
];

describe('BucketFilePicker', () => {
    beforeEach(() => {
        listBucketObjects.mockReset();
        listBucketObjects.mockResolvedValue(SAMPLE_OBJECTS);
    });

    it('no llama a listBucketObjects cuando open=false', () => {
        render(
            <BucketFilePicker
                open={false}
                onClose={vi.fn()}
                onSelect={vi.fn()}
                bucketId={1}
            />,
        );
        expect(listBucketObjects).not.toHaveBeenCalled();
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
            expect(listBucketObjects).toHaveBeenCalledWith(1, '');
        });
        expect(await screen.findByText('perfil.jpg')).toBeInTheDocument();
        expect(screen.getByText('informe.pdf')).toBeInTheDocument();
        expect(screen.getByText('header.webp')).toBeInTheDocument();
    });

    it('click en una fila llama onSelect con {nombre, enlace, url} y cierra', async () => {
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
        });
        expect(onClose).toHaveBeenCalled();
    });

    it('búsqueda filtra por nombre (case-insensitive)', async () => {
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
        fireEvent.change(search, { target: { value: 'PERFIL' } });

        await waitFor(() => {
            expect(screen.getByText('perfil.jpg')).toBeInTheDocument();
            expect(screen.queryByText('informe.pdf')).not.toBeInTheDocument();
            expect(screen.queryByText('header.webp')).not.toBeInTheDocument();
        });
    });

    it('cambiar de tab refetcha con el nuevo prefix', async () => {
        render(
            <BucketFilePicker
                open
                onClose={vi.fn()}
                onSelect={vi.fn()}
                bucketId={1}
                prefixes={['fotos/', 'docs/']}
            />,
        );
        await waitFor(() => {
            expect(listBucketObjects).toHaveBeenCalledWith(1, 'fotos/');
        });

        fireEvent.click(screen.getByText('docs'));
        await waitFor(() => {
            expect(listBucketObjects).toHaveBeenCalledWith(1, 'docs/');
        });
    });
});
