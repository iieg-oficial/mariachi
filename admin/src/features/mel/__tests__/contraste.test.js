import { describe, expect, it } from 'vitest';
import {
    aclarar,
    esHex,
    esSuperficie,
    evaluarToken,
    ratioContraste,
    veredicto,
} from '@features/mel/helpers/contraste';

const BLANCO = '#FFFFFF';

describe('ratioContraste', () => {
    it('reproduce los ratios de la semilla del IIEG sobre blanco', () => {
        expect(ratioContraste('#5C2472', BLANCO)).toBe(10.8);
        expect(ratioContraste('#2e4372', BLANCO)).toBe(9.7);
        expect(ratioContraste('#465055', BLANCO)).toBe(8.3);
        expect(ratioContraste('#B3261E', BLANCO)).toBe(6.5);
        expect(ratioContraste('#9E5200', BLANCO)).toBe(5.7);
        expect(ratioContraste('#1F7A4D', BLANCO)).toBe(5.3);
    });

    it('confirma que el naranja institucional no sirve para texto', () => {
        expect(ratioContraste('#FF8300', BLANCO)).toBe(2.5);
    });

    it('es simetrico: el blanco sobre el morado da lo mismo que al reves', () => {
        expect(ratioContraste(BLANCO, '#5C2472')).toBe(ratioContraste('#5C2472', BLANCO));
    });

    it('el blanco si es legible sobre los dos colores oscuros de marca', () => {
        expect(ratioContraste(BLANCO, '#5C2472')).toBeGreaterThan(4.5);
        expect(ratioContraste(BLANCO, '#2e4372')).toBeGreaterThan(4.5);
    });

    it('devuelve null cuando el valor no es un hex de seis digitos', () => {
        expect(ratioContraste('Garet, system-ui', BLANCO)).toBeNull();
        expect(ratioContraste('#fff', BLANCO)).toBeNull();
        expect(ratioContraste(null, BLANCO)).toBeNull();
    });
});

describe('veredicto', () => {
    it('separa AA, solo texto grande y falla', () => {
        expect(veredicto(10.8).nivel).toBe('aa');
        expect(veredicto(4.5).nivel).toBe('aa');
        expect(veredicto(4.4).nivel).toBe('grande');
        expect(veredicto(3).nivel).toBe('grande');
        expect(veredicto(2.9).nivel).toBe('falla');
        expect(veredicto(null).nivel).toBe('na');
    });
});

describe('esHex', () => {
    it('acepta solo hex de seis digitos', () => {
        expect(esHex('#5C2472')).toBe(true);
        expect(esHex('#5c2472')).toBe(true);
        expect(esHex('#fff')).toBe(false);
        expect(esHex('rgb(0,0,0)')).toBe(false);
        expect(esHex(1.25)).toBe(false);
    });
});

describe('aclarar', () => {
    it('mezcla con blanco y deja el color intacto en cero', () => {
        expect(aclarar('#5C2472', 0)).toBe('rgb(92, 36, 114)');
        expect(aclarar('#5C2472', 1)).toBe('rgb(255, 255, 255)');
    });

    it('devuelve el valor tal cual si no es un color', () => {
        expect(aclarar('1.25rem', 0.5)).toBe('1.25rem');
    });
});

describe('esSuperficie', () => {
    it('reconoce los fondos y las variantes suaves', () => {
        expect(esSuperficie('color.bg')).toBe(true);
        expect(esSuperficie('color.surface-field')).toBe(true);
        expect(esSuperficie('color.success-soft')).toBe(true);
        expect(esSuperficie('color.danger-soft')).toBe(true);
    });

    it('no confunde los colores de marca con superficies', () => {
        expect(esSuperficie('color.primary')).toBe(false);
        expect(esSuperficie('color.accent')).toBe(false);
        expect(esSuperficie('color.text')).toBe(false);
    });
});

describe('evaluarToken', () => {
    const FONDO = '#FFFFFF';
    const TEXTO = '#465055';

    it('mide un color de marca contra el fondo', () => {
        const juicio = evaluarToken('color.primary', '#5C2472', FONDO, TEXTO);
        expect(juicio.etiqueta).toBe('10.8:1');
        expect(juicio.nivel).toBe('aa');
        expect(juicio.contra).toBe('sobre el fondo');
    });

    it('mide una superficie por el texto que va encima, no al reves', () => {
        const juicio = evaluarToken('color.success-soft', '#E3F1E9', FONDO, TEXTO);
        expect(juicio.contra).toBe('texto encima');
        expect(juicio.nivel).toBe('aa');
    });

    it('la superficie suave dejaria de ser roja con la medicion correcta', () => {
        const comoFondo = veredicto(ratioContraste('#E3F1E9', FONDO));
        const comoSuperficie = evaluarToken('color.success-soft', '#E3F1E9', FONDO, TEXTO);
        expect(comoFondo.nivel).toBe('falla');
        expect(comoSuperficie.nivel).toBe('aa');
    });

    it('no inventa veredicto cuando el valor no es color', () => {
        expect(evaluarToken('font.family.sans', 'Garet', FONDO, TEXTO).nivel).toBe('na');
    });
});
