import { describe, expect, it } from 'vitest';
import { fieldFromFormValues, fieldToFormValues } from '../fieldUtils';
import { DATE_LIMIT_MODES, DATE_LIMIT_MODES_FIJOS } from '../../../constants/definitionTypes';

const base = {
    type: 'date',
    name: 'fecha_captura',
    label: 'Fecha de captura',
    colSpan: 1,
    col: 1,
};

describe('modos ofrecidos por el editor', () => {
    it('solo el máximo ofrece el modo relativo', () => {
        expect(DATE_LIMIT_MODES.map((m) => m.value)).toEqual(['none', 'today', 'fixed']);
        expect(DATE_LIMIT_MODES_FIJOS.map((m) => m.value)).toEqual(['none', 'fixed']);
    });
});

describe('límites de fecha del campo', () => {
    it('traduce el modo «hoy» al literal del contrato', () => {
        const field = fieldFromFormValues({ ...base, maxDateMode: 'today' });
        expect(field.validation).toEqual({ maxDate: 'hoy' });
    });

    it('formatea la fecha fija a ISO', () => {
        const field = fieldFromFormValues({
            ...base,
            minDateMode: 'fixed',
            minDateValue: new Date('2020-01-15T12:00:00'),
        });
        expect(field.validation).toEqual({ minDate: '2020-01-15' });
    });

    it('no emite validation sin límites', () => {
        const field = fieldFromFormValues({ ...base, minDateMode: 'none', maxDateMode: 'none' });
        expect(field.validation).toBeUndefined();
    });

    it('ignora los límites en campos que no son de fecha', () => {
        const field = fieldFromFormValues({ ...base, type: 'text', maxDateMode: 'today' });
        expect(field.validation).toBeUndefined();
    });

    it('conserva ambos límites en un rango', () => {
        const field = fieldFromFormValues({
            ...base,
            type: 'date_range',
            minDateMode: 'fixed',
            minDateValue: new Date('2020-01-01T12:00:00'),
            maxDateMode: 'today',
        });
        expect(field.validation).toEqual({ minDate: '2020-01-01', maxDate: 'hoy' });
    });

    it('rehidrata el formulario desde la definición', () => {
        const values = fieldToFormValues({
            ...base,
            validation: { minDate: '2020-01-01', maxDate: 'hoy' },
        });
        expect(values.minDateMode).toBe('fixed');
        expect(values.minDateValue.format('YYYY-MM-DD')).toBe('2020-01-01');
        expect(values.maxDateMode).toBe('today');
        expect(values.maxDateValue).toBeNull();
    });

    it('un campo sin límites abre en «sin límite»', () => {
        const values = fieldToFormValues(base);
        expect(values.minDateMode).toBe('none');
        expect(values.maxDateMode).toBe('none');
    });
});
