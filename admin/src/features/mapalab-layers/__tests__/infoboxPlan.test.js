import { describe, it, expect } from 'vitest';
import { buildCardPlan, referencedFields } from '@shared/infoboxPlan';

const PROPS = {
    nombre: 'Esc. Benito Juárez',
    MUNICIPIO: 'Zapopan',
    calle: 'Hidalgo',
    numero_ext: 45,
    colonia: 'Centro',
    servicios: 'Agua; Luz; Drenaje',
    cp: '45010',
    hombres: 8000,
    mujeres: 4321,
    telefono: '33 1234 5678',
};

const plan = (config, props = PROPS, opts) => buildCardPlan(props, config, opts);
const bloque = (p, type) => p.blocks.find((b) => b.type === type);

describe('buildCardPlan', () => {
    it('resuelve el título y respeta headerTransform', () => {
        const p = plan({ headerField: 'nombre', headerTransform: { valueMap: { 'Esc. Benito Juárez': 'Primaria Juárez' } } });
        expect(p.title).toBe('Primaria Juárez');
    });

    it('lee columnas publicadas en mayúsculas', () => {
        const p = plan({ list: [{ label: 'Municipio', field: 'municipio' }] });
        expect(bloque(p, 'list').rows[0].value).toBe('Zapopan');
    });

    it('une columnas y descarta la parte vacía con su prefijo', () => {
        const p = plan({
            list: [{
                label: 'Dirección',
                compose: ['calle', { field: 'numero_int', prefix: 'Int. ' }, { field: 'colonia', prefix: 'Col. ' }],
                sep: ', ',
            }],
        });
        expect(bloque(p, 'list').rows[0].value).toBe('Hidalgo, Col. Centro');
    });

    it('un valor unido no pasa por el formato de números', () => {
        const p = plan({ list: [{ label: 'Dirección', compose: ['calle_inexistente', 'cp'] }] });
        expect(bloque(p, 'list').rows[0].value).toBe('45010');
    });

    it('la suma sí se formatea', () => {
        const p = plan({ cards: [{ label: 'Total', compose: ['hombres', 'mujeres'], op: 'sum' }] });
        expect(bloque(p, 'cards').cards[0].value).toBe('12 321');
    });

    it('parte los multivalor por punto y coma', () => {
        const p = plan({ list: [{ label: 'Servicios', field: 'servicios', split: true }] });
        expect(bloque(p, 'list').rows[0].values).toEqual(['Agua', 'Luz', 'Drenaje']);
    });

    it('arma el link de los íconos', () => {
        const p = plan({ iconText: [{ icon: 'celular', field: 'telefono' }] });
        expect(bloque(p, 'iconText').items[0].href).toBe('tel:3312345678');
    });

    it('esconde la acción de reportar salvo que se permita', () => {
        const cfg = { iconText: [{ icon: 'info', value: 'Reportar', action: 'report' }] };
        expect(bloque(plan(cfg), 'iconText')).toBeUndefined();
        expect(bloque(plan(cfg, PROPS, { allowActions: true }), 'iconText').items[0].action).toBe('report');
    });

    it('respeta el orden de varias instancias del mismo bloque', () => {
        const p = plan({
            list: [{ id: 'a', items: [{ label: 'A', field: 'calle' }] }, { id: 'b', items: [{ label: 'B', field: 'colonia' }] }],
            blockOrder: ['list:b', 'list:a'],
        });
        expect(p.blocks.map((b) => b.key)).toEqual(['list:b', 'list:a']);
    });

    it('descarta los bloques que no dejan nada visible', () => {
        const p = plan({ headerField: 'nombre', list: [{ label: 'X', field: 'no_existe' }] });
        expect(p.blocks).toEqual([]);
        expect(p.isEmpty).toBe(false);
    });

    it('sin título ni bloques queda vacío', () => {
        expect(plan({ list: [{ label: 'X', field: 'no_existe' }] }).isEmpty).toBe(true);
    });

    it('las cifras van a dos columnas en móvil', () => {
        const p = plan({ cards: [{ label: 'H', field: 'hombres' }] }, PROPS, { variant: 'mobile' });
        expect(bloque(p, 'cards').columns).toBe(2);
    });
});

describe('referencedFields', () => {
    it('recoge el título, los campos y las partes de un compose', () => {
        const campos = referencedFields({
            headerField: 'nombre',
            labelGroups: [{ fields: ['municipio', { compose: ['calle', 'colonia'] }] }],
            cards: [{ label: 'T', compose: ['hombres', 'mujeres'], op: 'sum' }],
            text: [{ id: 't0', items: [{ field: 'cp' }] }],
        });
        expect([...campos].sort()).toEqual(
            ['calle', 'colonia', 'cp', 'hombres', 'mujeres', 'municipio', 'nombre'],
        );
    });
});
