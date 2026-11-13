import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ParentCell from '@shared/components/dataGrid/cells/ParentCell';
import SelectCell from '@shared/components/dataGrid/cells/SelectCell';

const comunes = { setRowData: vi.fn(), stopEditing: vi.fn() };

describe('celdas fuera de edición', () => {
    it('la ubicación se pinta como texto y no como selector', () => {
        const { container } = render(
            <ParentCell {...comunes} focus={false} rowData="tema_salud" columnData={{ treeData: [], pathOf: () => 'Salud' }} />,
        );
        expect(screen.getByText('Salud')).toBeTruthy();
        expect(container.querySelector('input')).toBeNull();
    });

    it('un catálogo muestra la etiqueta de su valor', () => {
        const { container } = render(
            <SelectCell {...comunes} focus={false} rowData="leaf" columnData={{ options: [{ value: 'leaf', label: 'Capa' }] }} />,
        );
        expect(screen.getByText('Capa')).toBeTruthy();
        expect(container.querySelector('input')).toBeNull();
    });
});
