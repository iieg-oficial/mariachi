import { describe, it, expect } from 'vitest';
import { configATexto, textoAConfig } from '@features/mapalab-layers/constants/infoboxTexto';

const ida = (cfg) => configATexto(cfg);
const vuelta = (txt) => textoAConfig(txt);

describe('configATexto', () => {
    it('escribe una tarjetita completa en lineas legibles', () => {
        const { texto, razones } = ida({
            headerField: 'nombre',
            labelGroups: [{ fields: ['municipio'], color: '#FF8300', bg: '#FFF2E5' }],
            list: [{ label: 'Turno', field: 'turno' }],
            iconText: [{ icon: 'ubicacion', compose: ['calle', { field: 'numero_ext', prefix: '#' }], sep: ', ' }],
            cards: [{ label: 'Total', compose: ['hombres', 'mujeres'], op: 'sum' }],
        });
        expect(razones).toEqual([]);
        expect(texto.split('\n').map((l) => l.replace(/\s+/g, ' '))).toEqual([
            'titulo nombre',
            'insignia municipio naranja',
            'renglon Turno: turno',
            'ubicacion calle, "#"numero_ext',
            'cifra Total: hombres + mujeres',
        ]);
    });

    it('avisa en vez de perder lo que no sabe escribir', () => {
        expect(ida({ headerField: 'n', headerTransform: { valueMap: {} } }).razones)
            .toContain('el titulo usa headerTransform');
        expect(ida({ list: [{ label: 'A', field: 'a', href: 'https://x' }] }).razones.join())
            .toContain('href');
        expect(ida({ labelGroups: [{ staticValues: ['fijo'] }] }).razones)
            .toContain('hay etiquetas con valores fijos');
        expect(ida({ list: [{ label: 'A', compose: ['a', 'b'], sep: ' | ' }] }).razones.join())
            .toContain('separador propio');
    });
});

describe('textoAConfig', () => {
    it('vuelve a la misma configuracion', () => {
        const original = {
            headerField: 'nombre',
            labelGroups: [{ fields: [{ field: 'municipio' }], color: '#FF8300', bg: '#FFF2E5' }],
            list: [{ field: 'turno', label: 'Turno' }],
            cards: [{ compose: [{ field: 'hombres' }, { field: 'mujeres' }], op: 'sum', label: 'Total' }],
            cardsColumns: 1,
            blockOrder: ['labelGroups', 'list', 'cards'],
        };
        const { texto } = configATexto(original);
        const { config, errores } = vuelta(texto);
        expect(errores).toEqual([]);
        expect(config).toEqual(original);
    });

    it('conserva prefijos y sufijos de una direccion compuesta', () => {
        const { config } = vuelta('ubicacion   calle, "#"numero_ext, "Col. "colonia');
        expect(config.iconText[0].compose).toEqual([
            { field: 'calle' },
            { field: 'numero_ext', prefix: '#' },
            { field: 'colonia', prefix: 'Col. ' },
        ]);
    });

    it('las lineas separadas del mismo tipo quedan como bloques distintos', () => {
        const { config } = vuelta('insignia municipio naranja\nrenglon Turno: turno\ninsignia nivel morado');
        expect(config.labelGroups).toHaveLength(2);
        expect(config.blockOrder).toEqual(['labelGroups:t0', 'list', 'labelGroups:t2']);
    });

    it('las lineas seguidas del mismo tipo van en un solo bloque', () => {
        const { config } = vuelta('insignia municipio naranja\ninsignia nivel morado');
        expect(config.labelGroups).toHaveLength(2);
        expect(config.labelGroups.map((g) => g.color)).toEqual(['#FF8300', '#7B61FF']);
        expect(config.blockOrder).toBeUndefined();
    });

    it('el color se lee de la ultima palabra', () => {
        const { config } = vuelta('insignia nivel morado');
        expect(config.labelGroups[0].color).toBe('#7B61FF');
    });

    it('reporta la linea exacta que no entendio', () => {
        const { errores } = vuelta('titulo nombre\nchafa algo\nrenglon sin dos puntos');
        expect(errores[0]).toContain('Línea 2');
        expect(errores[1]).toContain('Línea 3');
    });

    it('ignora comentarios y lineas en blanco', () => {
        const { config, errores } = vuelta('# la tarjetita de escuelas\n\ntitulo nombre\n');
        expect(errores).toEqual([]);
        expect(config).toEqual({ headerField: 'nombre' });
    });
});
