import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SldReviewCards from '@features/revision/components/SldReviewCards';

const ITEM = {
    id: 7,
    resource_type: 'sld',
    resource_id: 'seguridad:homicidio',
    actualizado_en: '2026-11-18T10:00:00Z',
    usuario: { name: 'Ana' },
    data: { style_title: 'Homicidio doloso', colors: ['#111111', '#222222'], origen: 'lote' },
};

describe('SldReviewCards', () => {
    it('shows nothing without pending styles', () => {
        const { container } = render(<SldReviewCards items={[]} onReview={vi.fn()} onApprove={vi.fn()} onReject={vi.fn()} />);
        expect(container.innerHTML).toBe('');
    });

    it('reviews, approves and rejects from the card', async () => {
        const onReview = vi.fn();
        const onApprove = vi.fn();
        const onReject = vi.fn();
        render(<SldReviewCards items={[ITEM]} onReview={onReview} onApprove={onApprove} onReject={onReject} />);
        expect(screen.getByText('Homicidio doloso')).toBeTruthy();
        expect(screen.getByText('Lote')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /Revisar/ }));
        expect(onReview).toHaveBeenCalledWith(ITEM);
        fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }));
        expect(onReject).toHaveBeenCalledWith(ITEM);
        fireEvent.click(screen.getByRole('button', { name: /Aprobar/ }));
        fireEvent.click(await screen.findByRole('button', { name: 'Aprobar' }));
        await waitFor(() => expect(onApprove).toHaveBeenCalledWith(ITEM));
    });
});
