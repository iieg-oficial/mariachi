import { describe, expect, it } from 'vitest';
import { buildGridColumns } from '@shared/components/dataGrid/cellTypes';

const COLUMNS = [
    { key: 'id', title: 'ID', type: 'text', group: 'Identidad', sticky: true },
    { key: 'label', title: 'Nombre', type: 'text', group: 'Identidad' },
    { key: 'cql_filter', title: 'Filtro CQL', type: 'textarea', group: 'Servicios' },
    { key: 'tiled', title: 'Tiles', type: 'bool', group: 'Servicios' },
];

const build = () => buildGridColumns({
    columnsMeta: COLUMNS,
    catalogs: {},
    draft: {},
    rowKeyField: 'id',
    conflictKeys: new Set(),
});

describe('buildGridColumns', () => {
    it('la columna de texto largo se edita en overlay y conserva el foco', () => {
        const cql = build().find((column) => column.title === 'Filtro CQL');
        expect(cql.keepFocus).toBe(true);
        expect(cql.disableKeys).toBe(true);
    });

    it('el texto largo conserva copiar, pegar y borrar', () => {
        const cql = build().find((column) => column.title === 'Filtro CQL');
        expect(cql.copyValue({ rowData: { cql_filter: 'tipo=A' } })).toBe('tipo=A');
        expect(cql.pasteValue({ rowData: {}, value: '  tipo=B  ' })).toEqual({ cql_filter: 'tipo=B' });
        expect(cql.pasteValue({ rowData: {}, value: '   ' })).toEqual({ cql_filter: null });
        expect(cql.deleteValue({ rowData: {} })).toEqual({ cql_filter: null });
    });

    it('deja fuera la columna sticky', () => {
        expect(build().map((column) => column.title)).not.toContain('ID');
    });
});
