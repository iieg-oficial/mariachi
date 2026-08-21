import { describe, expect, it } from 'vitest';
import { autoriaDesdeHistorial, buildRespuestas } from '../components/snapshotUtils';

const definicion = {
    steps: [
        {
            id: 'general',
            type: 'form',
            title: 'Generales',
            fields: [
                { name: 'razon_social', label: 'Razón social', type: 'text' },
                { name: 'nota', label: 'Nota', type: 'info' },
            ],
        },
        {
            id: 'bases_datos',
            type: 'repeater',
            title: 'Bases',
            fields: [{ name: 'diccionario', label: 'Diccionario', type: 'text' }],
        },
    ],
};

const datos = {
    general: { razon_social: 'Acme SA' },
    bases_datos: [{ diccionario: 'si' }, { diccionario: 'no' }],
};

describe('autoría derivada del historial admin', () => {
    it('se queda con la última entrada de cada campo', () => {
        const autoria = autoriaDesdeHistorial([
            { field_path: 'general.razon_social', actor_nombre: 'Ana', cambiado_en: '2026-08-21T10:00:00Z' },
            { field_path: 'general.razon_social', actor_nombre: 'Beto', cambiado_en: '2026-08-21T11:00:00Z' },
        ]);
        expect(autoria['general.razon_social'].nombre).toBe('Beto');
    });

    it('no depende del orden en que llegue el historial', () => {
        const autoria = autoriaDesdeHistorial([
            { field_path: 'general.x', actor_nombre: 'Beto', cambiado_en: '2026-08-21T11:00:00Z' },
            { field_path: 'general.x', actor_nombre: 'Ana', cambiado_en: '2026-08-21T10:00:00Z' },
        ]);
        expect(autoria['general.x'].nombre).toBe('Beto');
    });

    it('sin historial no hay autoría', () => {
        expect(autoriaDesdeHistorial()).toEqual({});
    });
});

describe('respuestas con autor por campo', () => {
    it('cuelga el autor de cada entrada de un paso simple', () => {
        const autoria = autoriaDesdeHistorial([
            { field_path: 'general.razon_social', actor_nombre: 'Ana', cambiado_en: '2026-08-21T10:00:00Z' },
        ]);
        const [general] = buildRespuestas(definicion, datos, autoria);
        expect(general.entries[0].autor.nombre).toBe('Ana');
    });

    it('distingue el autor de cada item del repeater', () => {
        const autoria = autoriaDesdeHistorial([
            { field_path: 'bases_datos[0].diccionario', actor_nombre: 'Ana', cambiado_en: '2026-08-21T10:00:00Z' },
            { field_path: 'bases_datos[1].diccionario', actor_nombre: 'Beto', cambiado_en: '2026-08-21T10:00:00Z' },
        ]);
        const bases = buildRespuestas(definicion, datos, autoria)[1];
        expect(bases.items[0].entries[0].autor.nombre).toBe('Ana');
        expect(bases.items[1].entries[0].autor.nombre).toBe('Beto');
    });

    it('sin autoría las respuestas siguen armándose igual', () => {
        const [general] = buildRespuestas(definicion, datos);
        expect(general.entries[0].value).toBe('Acme SA');
        expect(general.entries[0].autor).toBeUndefined();
    });

    it('omite los campos informativos, que no capturan valor', () => {
        const [general] = buildRespuestas(definicion, datos);
        expect(general.entries.map((e) => e.key)).toEqual(['razon_social']);
    });
});
