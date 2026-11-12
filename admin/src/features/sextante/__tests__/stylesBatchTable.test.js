import { describe, expect, it } from 'vitest';
import {
    classCount,
    cutsForDisplay,
    cutsForEditing,
    draftToRow,
    formatCuts,
    gridToTable,
    hasZeroClass,
    removeRows,
    parseCuts,
    rowsToTable,
    severityOf,
    updateRow,
} from '@features/sextante/utils/stylesBatchTable';

const ROW = {
    fila: 2,
    nombre: 'Homicidio doloso (tasa)',
    workspace: 'seguridad',
    layer_name: 'homicidio',
    attribute: 'tasa',
    unidades: 'carpetas por cada 100 mil, habitantes',
    paleta: 'S_FUCSIA_ROJO_7_CRITICA',
    orientacion: 'Inferior',
    cortes_texto: '[0,0, 1, 3, null]',
};

describe('stylesBatchTable', () => {
    it('reads cuts with an open end', () => {
        expect(parseCuts('[0,0, 1, 3, null]')).toEqual([0, 0, 1, 3, null]);
        expect(parseCuts('0, 10, y más')).toEqual([0, 10, null]);
        expect(formatCuts([0, 0, 1, null])).toBe('[0, 0, 1, null]');
        expect(cutsForDisplay('[0, 5, null]')).toEqual([0, 5, 'y más']);
        expect(cutsForDisplay('[null, -30, 30, null]')).toEqual(['y menos', -30, 30, 'y más']);
    });

    it('accepts words and ignores symbols in cuts', () => {
        expect(parseCuts('menos de, 10 %, $20, más de')).toEqual([null, 10, 20, null]);
        expect(parseCuts('−5, 1 000')).toEqual([-5, 1000]);
        expect(cutsForDisplay('0, diez')).toEqual([0, '?']);
        expect(cutsForEditing('[null, 0, 5, null]')).toBe('y menos, 0, 5, y más');
    });

    it('counts classes and detects the zero class', () => {
        expect(classCount('[0,0, 1, 3, null]')).toBe(4);
        expect(classCount('')).toBe(0);
        expect(hasZeroClass('[0,0, 1, 3]')).toBe(true);
        expect(hasZeroClass('[0, 1, 3]')).toBe(false);
    });

    it('rebuilds the table quoting cells with commas', () => {
        const table = rowsToTable([ROW]);
        const [header, line] = table.split('\n');
        expect(header).toBe(
            'capa,nombre_capa_geoserver,campo,unidades,paleta,orientacion_favorable,cortes_rangos,nombre_estilo,colores',
        );
        expect(line).toBe(
            'Homicidio doloso (tasa),seguridad:homicidio,tasa,"carpetas por cada 100 mil, habitantes",'
            + 'S_FUCSIA_ROJO_7_CRITICA,Inferior,"[0,0, 1, 3, null]",,',
        );
    });

    it('updates only the edited row', () => {
        const rows = [ROW, { ...ROW, fila: 3 }];
        const next = updateRow(rows, 3, { paleta: 'OTRA' });
        expect(next[0].paleta).toBe('S_FUCSIA_ROJO_7_CRITICA');
        expect(next[1].paleta).toBe('OTRA');
    });

    it('turns the pasted grid into a table without headers or empty rows', () => {
        const header = Object.fromEntries(
            ['capa', 'nombre_capa_geoserver', 'campo', 'unidades', 'paleta', 'orientacion_favorable', 'cortes_rangos']
                .map((c) => [c, c]),
        );
        const table = gridToTable([header, { capa: 'Tasa', cortes_rangos: '0, 1, 2' }, {}]);
        expect(table.split('\n')).toEqual([
            'capa,nombre_capa_geoserver,campo,unidades,paleta,orientacion_favorable,cortes_rangos',
            'Tasa,,,,,,"0, 1, 2"',
        ]);
        expect(gridToTable([{}, {}])).toBe('');
    });

    it('removes rows and reads drafts back as rows', () => {
        expect(removeRows([ROW, { ...ROW, fila: 3 }], [2]).map((r) => r.fila)).toEqual([3]);
        const row = draftToRow({
            id: 7,
            resource_id: 'seguridad:homicidio_tasa',
            data: { style_title: 'H', layer_name: 'homicidio', colors: ['#1'], style_abstract: 'Unidades: tasa' },
        });
        expect(row).toMatchObject({ fila: 7, alias: 'seguridad', layer_name: 'homicidio', unidades: 'tasa', colores: ['#1'] });
    });

    it('reads the severity from the palette name', () => {
        expect(severityOf('S_AQUA_OCRE_7_COMPARATIVA')).toBe('COMPARATIVA');
        expect(severityOf('D_9_S_X_5_SENSIBLE_S_Y_5_SENSIBLE')).toBe('SENSIBLE');
        expect(severityOf('')).toBe('SENSIBLE');
    });
});
