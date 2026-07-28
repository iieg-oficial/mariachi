import { describe, expect, it } from 'vitest';
import {
    colorOfTrigger, conditionIssueOf, dependentNamesOf, highlightRoleOf, relationOf,
} from '../conditionLinks';

const campo = (name, showWhen, tab) => ({
    name,
    label: name.toUpperCase(),
    type: 'text',
    ...(showWhen ? { showWhen } : {}),
    ...(tab ? { tab } : {}),
});

const TABS = [{ id: 'datos', title: 'Datos' }, { id: 'extra', title: 'Extra' }];

describe('relaciones entre campos condicionados', () => {
    it('lista los campos que dependen de un disparador', () => {
        const fields = [
            campo('tiene_jefe'),
            campo('nombre_jefe', { field: 'tiene_jefe', equals: 'true' }),
            campo('puesto_jefe', { field: 'tiene_jefe', equals: 'true' }),
            campo('otro'),
        ];
        expect(dependentNamesOf(fields, 'tiene_jefe')).toEqual(['nombre_jefe', 'puesto_jefe']);
        expect(dependentNamesOf(fields, 'otro')).toEqual([]);
    });

    it('el color de un disparador es estable', () => {
        expect(colorOfTrigger('tiene_jefe')).toBe(colorOfTrigger('tiene_jefe'));
        expect(colorOfTrigger('')).toBe('default');
    });

    it('resuelve la relación completa de un campo', () => {
        const fields = [
            campo('tiene_jefe'),
            campo('nombre_jefe', { field: 'tiene_jefe', equals: 'true' }),
        ];
        expect(relationOf(fields, [], 1)).toMatchObject({
            triggerName: 'tiene_jefe',
            dependents: [],
            issue: null,
        });
        expect(relationOf(fields, [], 0)).toMatchObject({
            triggerName: null,
            dependents: ['nombre_jefe'],
        });
    });
});

describe('condiciones rotas', () => {
    it('avisa cuando el disparador ya no existe', () => {
        const fields = [campo('nombre_jefe', { field: 'se_borro', equals: 'true' })];
        expect(conditionIssueOf(fields, [], 0)).toBe('sin-disparador');
    });

    it('avisa cuando el disparador vive en otra pestaña', () => {
        const fields = [
            campo('tiene_jefe', null, 'extra'),
            campo('nombre_jefe', { field: 'tiene_jefe', equals: 'true' }, 'datos'),
        ];
        expect(conditionIssueOf(fields, TABS, 1)).toBe('otra-pestana');
    });

    it('no avisa cuando comparten pestaña', () => {
        const fields = [
            campo('tiene_jefe', null, 'datos'),
            campo('nombre_jefe', { field: 'tiene_jefe', equals: 'true' }, 'datos'),
        ];
        expect(conditionIssueOf(fields, TABS, 1)).toBe(null);
    });

    it('detecta una cadena de condiciones que vuelve al mismo campo', () => {
        const fields = [
            campo('a', { field: 'c', equals: 'true' }),
            campo('b', { field: 'a', equals: 'true' }),
            campo('c', { field: 'b', equals: 'true' }),
        ];
        expect(conditionIssueOf(fields, [], 0)).toBe('circular');
    });

    it('un campo sin condición no tiene aviso', () => {
        expect(conditionIssueOf([campo('suelto')], [], 0)).toBe(null);
    });
});

describe('resaltado de la relación', () => {
    const fields = [
        campo('tiene_jefe'),
        campo('nombre_jefe', { field: 'tiene_jefe', equals: 'true' }),
        campo('ajeno'),
    ];

    it('sin relación activa no marca nada', () => {
        expect(highlightRoleOf(fields, null, 0)).toBe(null);
    });

    it('marca al disparador, a sus dependientes y atenúa el resto', () => {
        expect(highlightRoleOf(fields, 'tiene_jefe', 0)).toBe('disparador');
        expect(highlightRoleOf(fields, 'tiene_jefe', 1)).toBe('dependiente');
        expect(highlightRoleOf(fields, 'tiene_jefe', 2)).toBe('ajeno');
    });
});
