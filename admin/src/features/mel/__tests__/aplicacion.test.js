import { describe, expect, it } from 'vitest';
import { aplicacionDe, estiloApagado } from '@features/mel/helpers/aplicacion';

const COLORES_SEMBRADOS = [
    'color.primary', 'color.primary-deep', 'color.secondary', 'color.accent',
    'color.accent-deep', 'color.accent-soft', 'color.text', 'color.bg',
    'color.surface-field', 'color.success', 'color.success-soft', 'color.warning',
    'color.warning-soft', 'color.danger', 'color.danger-soft', 'color.info', 'color.info-soft',
];

describe('aplicacionDe', () => {
    it('todos los colores sembrados caen en algun elemento', () => {
        const huerfanos = COLORES_SEMBRADOS.filter(
            (clave) => aplicacionDe(clave, '#000000').elementos.length === 0,
        );
        expect(huerfanos).toEqual([]);
    });

    it('el color de marca lleva al titulo y al boton', () => {
        expect(aplicacionDe('color.primary', '#5C2472').elementos).toContain('titulo');
        expect(aplicacionDe('color.primary', '#5C2472').elementos).toContain('botonPrimario');
    });

    it('los tamanos de fuente apuntan a su escalon', () => {
        expect(aplicacionDe('font.size.2xl', '2rem').elementos).toContain('titulo');
        expect(aplicacionDe('font.size.base', '1rem').elementos).toContain('bajada');
        expect(aplicacionDe('font.size.xs', '0.75rem').elementos).toContain('nota');
    });

    it('un breakpoint encoge la pieza en vez de quedarse sin lugar', () => {
        const { demo, elementos } = aplicacionDe('breakpoint.md', '768px');
        expect(elementos).toContain('lienzo');
        expect(demo).toEqual({ tipo: 'ancho', valor: 768 });
    });

    it('una sombra se aplica a una tarjeta que no la lleva', () => {
        const { demo, elementos, nota } = aplicacionDe('shadow.sm', '0 1px 2px rgba(0,0,0,0.04)');
        expect(elementos).toContain('tarjetaSombra');
        expect(demo.tipo).toBe('sombra');
        expect(nota).not.toBe('');
    });

    it('un espaciado se convierte en la separacion de los botones', () => {
        expect(aplicacionDe('space.4', '1rem').demo).toEqual({ tipo: 'espacio', valor: 16 });
    });

    it('un radio redondea botones y tarjetas', () => {
        const { demo, elementos } = aplicacionDe('radius.md', '8px');
        expect(elementos).toContain('tarjetas');
        expect(demo).toEqual({ tipo: 'radio', valor: 8 });
    });

    it('la paleta de datos lleva a la grafica', () => {
        expect(aplicacionDe('dataviz.seq.3', '#B98FC7').elementos).toEqual(['grafica']);
    });
});

describe('estiloApagado', () => {
    const aplicacion = { elementos: ['titulo'], demo: null, nota: '' };

    it('no apaga nada cuando no hay seleccion activa', () => {
        expect(estiloApagado('bajada', aplicacion, false)).toEqual({});
    });

    it('deja vivo lo que usa el token y apaga el resto', () => {
        expect(estiloApagado('titulo', aplicacion, true).opacity).toBe(1);
        expect(estiloApagado('bajada', aplicacion, true).opacity).toBeLessThan(0.2);
    });
});
