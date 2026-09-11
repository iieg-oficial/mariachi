import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import InfoBoxPreview from '../InfoBoxPreview';

describe('InfoBoxPreview con formato de año', () => {
    it('recorta a año solo los campos marcados', () => {
        render(
            <InfoBoxPreview
                value={{
                    labelGroups: [{ fields: [{ field: 'fecha', formato: 'anio' }] }],
                    list: [
                        { field: 'fecha', label: 'Año de la información', formato: 'anio' },
                        { field: 'fecha', label: 'Fecha de alta' },
                    ],
                }}
            />,
        );
        expect(screen.getAllByText('2026')).toHaveLength(2);
        expect(screen.getAllByText('2026-01-15')).toHaveLength(1);
    });
});
