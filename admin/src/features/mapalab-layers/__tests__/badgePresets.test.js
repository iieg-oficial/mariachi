import { describe, expect, it } from 'vitest';
import { isBadgeInValidityWindow, resolveBadge } from '@features/mapalab-layers/constants/badgePresets';

describe('resolveBadge', () => {
    it('toma color y detalle del preset', () => {
        const r = resolveBadge({ variant: 'new' });

        expect(r.label).toBe('Nueva');
        expect(r.color).toBe('#1F9D55');
        expect(r.inicial).toBe('N');
    });

    it('la etiqueta propia gana sobre la del preset', () => {
        expect(resolveBadge({ variant: 'new', label: 'Recién horneada' }).inicial).toBe('R');
    });

    it('el modo personalizado exige color y etiqueta', () => {
        expect(resolveBadge({ variant: 'custom', label: 'Beta' })).toBeNull();
        expect(resolveBadge({ variant: 'custom', color: '#123456' })).toBeNull();
        expect(resolveBadge({ variant: 'custom', color: '#123456', label: 'Beta' }).inicial).toBe('B');
    });

    it('el fondo suave se deriva del color, y un color inválido no rompe', () => {
        expect(resolveBadge({ variant: 'new' }).bg).toBe('#1F9D551A');
        expect(resolveBadge({ variant: 'custom', color: 'rojo', label: 'X' }).bg).toBe('transparent');
    });

    it('sin badge no hay nada que resolver', () => {
        expect(resolveBadge(null)).toBeNull();
        expect(resolveBadge({ variant: 'inventado' })).toBeNull();
    });
});

describe('isBadgeInValidityWindow', () => {
    const hoy = new Date('2026-09-02T12:00:00Z');

    it('sin fechas siempre está vigente', () => {
        expect(isBadgeInValidityWindow({ variant: 'new' }, hoy)).toBe(true);
    });

    it('antes de la fecha de inicio todavía no aplica', () => {
        expect(isBadgeInValidityWindow({ validFrom: '2026-09-03' }, hoy)).toBe(false);
        expect(isBadgeInValidityWindow({ validFrom: '2026-09-02' }, hoy)).toBe(true);
    });

    it('después de la fecha final deja de aplicar', () => {
        expect(isBadgeInValidityWindow({ validUntil: '2026-09-01' }, hoy)).toBe(false);
        expect(isBadgeInValidityWindow({ validUntil: '2026-09-02' }, hoy)).toBe(true);
    });
});
