import { describe, expect, it } from 'vitest';
import {
    classCount,
    cutsForDisplay,
    formatCuts,
    hasZeroClass,
    parseCuts,
    rowsToTable,
    severityOf,
    updateRow,
} from '@features/mapalab-layers/utils/stylesBatchTable';

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

    it('counts classes and detects the zero class', () => {
        expect(classCount('[0,0, 1, 3, null]')).toBe(4);
        expect(classCount('')).toBe(0);
        expect(hasZeroClass('[0,0, 1, 3]')).toBe(true);
        expect(hasZeroClass('[0, 1, 3]')).toBe(false);
    });

    it('rebuilds the table quoting cells with commas', () => {
        const table = rowsToTable([ROW]);
        const [header, line] = table.split('\n');
        expect(header).toBe('capa,nombre_capa_geoserver,campo,unidades,paleta,orientacion_favorable,cortes_rangos');
        expect(line).toBe(
            'Homicidio doloso (tasa),seguridad:homicidio,tasa,"carpetas por cada 100 mil, habitantes",'
            + 'S_FUCSIA_ROJO_7_CRITICA,Inferior,"[0,0, 1, 3, null]"',
        );
    });

    it('updates only the edited row', () => {
        const rows = [ROW, { ...ROW, fila: 3 }];
        const next = updateRow(rows, 3, { paleta: 'OTRA' });
        expect(next[0].paleta).toBe('S_FUCSIA_ROJO_7_CRITICA');
        expect(next[1].paleta).toBe('OTRA');
    });

    it('reads the severity from the palette name', () => {
        expect(severityOf('S_AQUA_OCRE_7_COMPARATIVA')).toBe('COMPARATIVA');
        expect(severityOf('D_9_S_X_5_SENSIBLE_S_Y_5_SENSIBLE')).toBe('SENSIBLE');
        expect(severityOf('')).toBe('SENSIBLE');
    });
});
