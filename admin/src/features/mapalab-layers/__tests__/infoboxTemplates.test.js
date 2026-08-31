import { describe, it, expect } from 'vitest';
import {
    buildDireccion,
    INFOBOX_TEMPLATES,
    pickField,
} from '@features/mapalab-layers/constants/infoboxTemplates';

const campos = (...defs) => defs.map((d) => (typeof d === 'string' ? { name: d, type: 'string' } : d));

const plantilla = (key) => INFOBOX_TEMPLATES.find((t) => t.key === key);

describe('pickField', () => {
    it('prefiere la coincidencia exacta sobre la parcial', () => {
        const fields = campos('nombre_municipio', 'municipio');
        expect(pickField(fields, ['municipio'])).toBe('municipio');
    });

    it('cae a la coincidencia parcial cuando no hay exacta', () => {
        expect(pickField(campos('nom_municipio_corto'), ['municipio'])).toBe('nom_municipio_corto');
    });

    it('respeta el orden de los candidatos', () => {
        expect(pickField(campos('name', 'nombre'), ['nombre', 'name'])).toBe('nombre');
    });

    it('devuelve null cuando no hay nada que encaje', () => {
        expect(pickField(campos('gid'), ['municipio'])).toBeNull();
        expect(pickField([], ['municipio'])).toBeNull();
    });
});

describe('buildDireccion', () => {
    it('combina calle, numero, colonia y cp en un compose', () => {
        const def = buildDireccion(campos('calle', 'numero_ext', 'colonia', 'cp'));
        expect(def).toEqual({
            compose: [
                { field: 'calle' },
                { field: 'numero_ext', prefix: '#' },
                { field: 'colonia', prefix: 'Col. ' },
                { field: 'cp', prefix: 'C.P. ' },
            ],
            sep: ', ',
        });
    });

    it('omite las partes que la capa no tiene', () => {
        const def = buildDireccion(campos('calle', 'colonia'));
        expect(def.compose.map((p) => p.field)).toEqual(['calle', 'colonia']);
    });

    it('usa un solo campo cuando la direccion ya viene completa', () => {
        expect(buildDireccion(campos('domicilio'))).toEqual({ field: 'domicilio' });
    });

    it('devuelve null cuando no hay nada de direccion', () => {
        expect(buildDireccion(campos('gid', 'municipio'))).toBeNull();
    });
});

describe('plantillas predefinidas', () => {
    it('sin campo de titulo ninguna plantilla se puede armar', () => {
        const fields = campos('gid', 'municipio');
        INFOBOX_TEMPLATES.forEach((t) => expect(t.build(fields)).toBeNull());
    });

    it('punto con municipio arma las dos etiquetas con su color', () => {
        const cfg = plantilla('punto_municipio').build(campos('nombre', 'municipio', 'tipo'));
        expect(cfg.headerField).toBe('nombre');
        expect(cfg.labelGroups.map((g) => g.fields[0])).toEqual(['municipio', 'tipo']);
        expect(cfg.labelGroups[0].color).toBe('#FF8300');
        expect(cfg.labelGroups[1].color).toBe('#7B61FF');
    });

    it('punto con contacto arma la direccion compuesta y los iconos', () => {
        const cfg = plantilla('punto_contacto').build(
            campos('nombre', 'municipio', 'calle', 'numero_ext', 'colonia', 'telefono', 'sitio_web'),
        );
        expect(cfg.iconText.map((i) => i.icon)).toEqual(['ubicacion', 'celular', 'web']);
        expect(cfg.iconText[0].compose).toHaveLength(3);
        expect(cfg.iconText[0].field).toBeUndefined();
    });

    it('punto con contacto no se ofrece si la capa no tiene datos de contacto', () => {
        expect(plantilla('punto_contacto').build(campos('nombre', 'municipio'))).toBeNull();
    });

    it('poligono con cifras toma hasta tres columnas numericas', () => {
        const cfg = plantilla('poligono_cifras').build(campos(
            'nombre',
            'municipio',
            { name: 'pob_total', type: 'xsd:int' },
            { name: 'viviendas', type: 'xsd:long' },
            { name: 'area_km2', type: 'xsd:double' },
            { name: 'densidad', type: 'xsd:double' },
        ));
        expect(cfg.cards.map((c) => c.field)).toEqual(['pob_total', 'viviendas', 'area_km2']);
        expect(cfg.cards[0].label).toBe('Pob total');
    });

    it('poligono con cifras no se ofrece sin columnas numericas', () => {
        expect(plantilla('poligono_cifras').build(campos('nombre', 'municipio'))).toBeNull();
    });
});
