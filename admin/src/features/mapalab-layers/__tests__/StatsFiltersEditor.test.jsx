import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import StatsFiltersEditor from '@features/mapalab-layers/components/layersEditor/StatsFiltersEditor';

const CAMPOS = [
    { name: 'tipo', type: 'string' },
    { name: 'clave_municipio', type: 'string' },
];

describe('StatsFiltersEditor', () => {
    it('lista las columnas que llegan como {name, type} sin romper el render', () => {
        render(
            <StatsFiltersEditor
                value={[{ field: '', op: 'eq', value: '' }]}
                onChange={vi.fn()}
                availableFields={CAMPOS}
            />,
        );
        fireEvent.mouseDown(screen.getAllByRole('combobox')[0]);
        expect(screen.getAllByText('tipo').length).toBeGreaterThan(0);
        expect(screen.getAllByText('clave_municipio').length).toBeGreaterThan(0);
    });
});
