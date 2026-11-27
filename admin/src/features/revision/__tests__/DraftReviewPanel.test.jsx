import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('@shared/services/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

import api from '@shared/services/api';
import DraftReviewPanel from '@features/revision/components/DraftReviewPanel';

const panel = (borrador) => render(
    <DraftReviewPanel borrador={borrador} onAprobar={vi.fn()} onRechazar={vi.fn()} aprobando={false} />,
);

describe('DraftReviewPanel', () => {
    beforeEach(() => vi.clearAllMocks());

    it('pinta la ficha publicada y la del borrador', async () => {
        api.get.mockResolvedValueOnce({ data: { frecuencia: 'Anual', descripcion: 'Vieja' } });
        panel({ id: 1, resource_type: 'layer_metadata', resource_id: 'ws:rios', data: { frecuencia: 'Mensual' } });
        await waitFor(() => expect(screen.getAllByText('Mensual')).toHaveLength(2));
        expect(api.get).toHaveBeenCalledWith('/layer-metadata/ws%3Arios');
        expect(screen.getAllByText('Anual')).toHaveLength(2);
        expect(screen.getByText('Hoy en el visor')).toBeTruthy();
    });

    it('calcula la numeralia del borrador sin publicarla', async () => {
        api.get.mockResolvedValueOnce({ data: {
            statsConfig: [{ position: 1, operation: 'count', label: 'Registros' }],
            values: [{ posicion: 1, valor: 10 }],
        } });
        api.post.mockResolvedValueOnce({ data: { value: 12 } });
        panel({ id: 2, resource_type: 'layer_stats', resource_id: 'rios', data: {
            stats_config: [{ position: 1, operation: 'count', label: 'Registros' }],
        } });
        expect(await screen.findByText('12')).toBeTruthy();
        expect(screen.getByText('10')).toBeTruthy();
        expect(api.post).toHaveBeenCalledWith('/layer-metadata/rios/stats/preview', expect.any(Object), { params: {} });
    });
});
