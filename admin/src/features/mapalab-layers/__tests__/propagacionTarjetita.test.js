import { describe, it, expect } from 'vitest';
import { grupoQueHereda, propagacionDelGrupo } from '@features/mapalab-layers/utils/propagacionTarjetita';

const TARJETA = { headerField: 'nombre' };
const OTRA = { headerField: 'otro' };

const ARBOL = [{
    id: 'salud', label: 'Salud', nodeType: 'tema', children: [{
        id: 'salud.unidades', label: 'Unidades', nodeType: 'group', littleCard: TARJETA,
        children: [
            { id: 'salud.unidades.primer', label: 'Primer nivel', nodeType: 'leaf', littleCard: TARJETA, inheritedFrom: 'salud.unidades' },
            { id: 'salud.unidades.segundo', label: 'Segundo nivel', nodeType: 'leaf', littleCard: TARJETA, inheritedFrom: 'salud.unidades' },
            { id: 'salud.unidades.hospitales', label: 'Hospitales', nodeType: 'leaf', littleCard: OTRA },
            { id: 'salud.unidades.pendiente', label: 'Sin tarjetita', nodeType: 'leaf' },
        ],
    }],
}];

describe('propagacionDelGrupo', () => {
    it('cuenta quién hereda, quién sobrescribe y quién no tiene nada', () => {
        const d = propagacionDelGrupo(ARBOL, 'salud.unidades');
        expect(d.total).toBe(4);
        expect(d.heredan.map((p) => p.label)).toEqual(['Primer nivel', 'Segundo nivel']);
        expect(d.propias.map((p) => p.label)).toEqual(['Hospitales']);
        expect(d.sinNada.map((p) => p.label)).toEqual(['Sin tarjetita']);
    });

    it('no aplica a un nodo que no es grupo', () => {
        expect(propagacionDelGrupo(ARBOL, 'salud')).toBeNull();
        expect(propagacionDelGrupo(ARBOL, 'no.existe')).toBeNull();
        expect(propagacionDelGrupo(ARBOL, null)).toBeNull();
    });
});

describe('grupoQueHereda', () => {
    it('devuelve el grupo del que una propiedad toma su tarjetita', () => {
        const g = grupoQueHereda(ARBOL, 'salud.unidades.primer');
        expect(g).toEqual({ id: 'salud.unidades', label: 'Unidades', config: TARJETA });
    });

    it('devuelve null cuando la capa tiene tarjetita propia', () => {
        expect(grupoQueHereda(ARBOL, 'salud.unidades.hospitales')).toBeNull();
    });

    it('devuelve null cuando no hereda de nadie', () => {
        expect(grupoQueHereda(ARBOL, 'salud.unidades.pendiente')).toBeNull();
    });
});

describe('propagacionDelGrupo con etiquetas intermedias', () => {
    const CON_ETIQUETAS = [{
        id: 'salud.unidades', label: 'Establecimientos de salud', nodeType: 'group', littleCard: TARJETA,
        children: [
            {
                id: 'salud.unidades.primer', label: 'Primer nivel', nodeType: 'label',
                children: [
                    { id: 'imss', label: 'IMSS', nodeType: 'leaf', littleCard: TARJETA, inheritedFrom: 'salud.unidades' },
                    { id: 'issste', label: 'ISSSTE', nodeType: 'leaf', littleCard: OTRA },
                ],
            },
            {
                id: 'salud.unidades.segundo', label: 'Segundo nivel', nodeType: 'label',
                children: [{ id: 'pemex', label: 'PEMEX', nodeType: 'leaf' }],
            },
        ],
    }];

    it('cuenta las propiedades que cuelgan de una etiqueta', () => {
        const datos = propagacionDelGrupo(CON_ETIQUETAS, 'salud.unidades');

        expect(datos.total).toBe(3);
        expect(datos.heredan.map((p) => p.id)).toEqual(['imss']);
        expect(datos.propias.map((p) => p.id)).toEqual(['issste']);
        expect(datos.sinNada.map((p) => p.id)).toEqual(['pemex']);
    });
});
