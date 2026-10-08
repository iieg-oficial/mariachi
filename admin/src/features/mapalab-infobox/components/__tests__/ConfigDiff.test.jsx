import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import ConfigDiff from '../ConfigDiff';

describe('ConfigDiff', () => {
    it('no truena con un título combinado y lo muestra por sus campos', () => {
        render(
            <ConfigDiff
                vigente={{ list: [{ field: 'a', label: 'A' }] }}
                propuesta={{ headerField: { compose: [{ field: 'calle' }, { field: 'colonia' }] }, list: [{ field: 'a', label: 'A' }] }}
            />,
        );
        expect(screen.getByText('calle + colonia')).toBeTruthy();
    });

    it('marca el texto escrito a mano que la tarjeta no tenía', () => {
        render(
            <ConfigDiff
                vigente={{ headerField: 'Viejo', text: [{ label: 'Nota vigente' }] }}
                propuesta={{ headerField: 'Título nuevo', text: [{ id: 't0', items: [{ label: 'Nota vigente' }, { label: 'Párrafo nuevo' }] }] }}
            />,
        );
        expect(screen.getByText('Texto escrito a mano')).toBeTruthy();
        expect(screen.getAllByText('Título nuevo').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Párrafo nuevo').length).toBeGreaterThan(0);
        expect(screen.queryAllByText('Nota vigente').every((el) => !el.closest('.ant-tag-orange'))).toBe(true);
    });
});
