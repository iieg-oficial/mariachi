import { describe, expect, it } from 'vitest';
import { opcionesColumnaFecha } from '@features/mapalab-layers/utils/columnaFecha';

const CAMPOS = [
    { name: 'cve_mun', type: 'string' },
    { name: 'fecha', type: 'date' },
    { name: 'obs_datetime', type: 'date' },
    { name: 'geom', type: 'geometry' },
];

const valores = (grupo) => grupo.options.map((o) => o.value);

describe('opcionesColumnaFecha', () => {
    it('pone primero las fechas y deja fuera la geometría', () => {
        const grupos = opcionesColumnaFecha(CAMPOS, null);
        expect(grupos.map((g) => g.label)).toEqual(['Fechas', 'Otras columnas']);
        expect(valores(grupos[0])).toEqual(['fecha', 'obs_datetime']);
        expect(valores(grupos[1])).toEqual(['cve_mun']);
    });

    it('conserva la columna guardada aunque ya no exista en la capa', () => {
        const grupos = opcionesColumnaFecha(CAMPOS, 'fecha_vieja');
        expect(grupos[0].label).toBe('Guardada');
        expect(grupos[0].options[0]).toEqual({ value: 'fecha_vieja', label: 'fecha_vieja (no existe en la capa)' });
    });

    it('sin campos no ofrece nada', () => {
        expect(opcionesColumnaFecha([], null)).toEqual([]);
        expect(opcionesColumnaFecha(undefined, null)).toEqual([]);
    });
});
