import { describe, expect, it } from 'vitest';
import { describeCell } from '@shared/components/dataGrid/cellInfo';

describe('describeCell', () => {
    it('una celda sin guardar dice su valor anterior', () => {
        expect(describeCell({ isDirty: true, baseValue: 'Hospital' })).toBe('Sin guardar · antes: Hospital');
    });

    it('una celda guardada dice quién, cuándo, desde dónde y qué había', () => {
        const texto = describeCell({
            isDirty: false,
            lastChange: { changed_by: 'Ana Ruiz', changed_at: '2026-11-12T19:40:00Z', source: 'grid', from_value: '' },
        });
        expect(texto).toMatch(/^Ana Ruiz · .+ · desde tabla · antes: \(vacío\)$/);
    });

    it('sin cambios no hay tooltip', () => {
        expect(describeCell({ isDirty: false })).toBeNull();
    });
});
