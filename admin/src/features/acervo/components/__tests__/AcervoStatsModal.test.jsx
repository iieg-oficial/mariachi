import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AcervoStatsModal from '@features/acervo/components/AcervoStatsModal';

vi.mock('@features/acervo/api/acervoService', () => ({
    default: {
        getAcervoResumen: vi.fn(),
        formatFileSize: (bytes) => `${bytes} B`,
    },
}));

import acervoService from '@features/acervo/api/acervoService';

const RESUMEN = {
    buckets: [
        {
            bucketId: 4,
            bucket: 'sieej',
            displayName: 'SIEEJ',
            fileCount: 12,
            imageCount: 3,
            documentCount: 8,
            otherCount: 1,
            folderCount: 5,
            totalSize: 148391,
            lastModified: '2026-07-27T18:49:02+00:00',
        },
    ],
    totals: {
        bucketCount: 1,
        fileCount: 12,
        imageCount: 3,
        documentCount: 8,
        otherCount: 1,
        folderCount: 5,
        totalSize: 148391,
        lastModified: '2026-07-27T18:49:02+00:00',
    },
};

describe('AcervoStatsModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        acervoService.getAcervoResumen.mockResolvedValue(RESUMEN);
    });

    it('no pide el resumen mientras está cerrado', () => {
        render(<AcervoStatsModal open={false} onClose={vi.fn()} />);
        expect(acervoService.getAcervoResumen).not.toHaveBeenCalled();
    });

    it('muestra los totales y la fila de cada bucket', async () => {
        render(<AcervoStatsModal open onClose={vi.fn()} />);
        await waitFor(() => expect(acervoService.getAcervoResumen).toHaveBeenCalled());
        expect(await screen.findByText('SIEEJ')).toBeInTheDocument();
        expect(screen.getByText('sieej')).toBeInTheDocument();
        expect(screen.getAllByText('148391 B').length).toBeGreaterThan(0);
    });

    it('la tabla no habilita scroll horizontal', async () => {
        render(<AcervoStatsModal open onClose={vi.fn()} />);
        await screen.findByText('SIEEJ');
        expect(document.querySelector('.ant-table-content')).not.toBeNull();
        expect(document.querySelector('.ant-table-body')).toBeNull();
    });

    it('avisa cuando el resumen falla', async () => {
        acervoService.getAcervoResumen.mockRejectedValue(new Error('boom'));
        render(<AcervoStatsModal open onClose={vi.fn()} />);
        expect(await screen.findByText('No se pudo obtener el resumen del Acervo')).toBeInTheDocument();
    });
});
