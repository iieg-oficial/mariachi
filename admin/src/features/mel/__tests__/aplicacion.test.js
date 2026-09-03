import { describe, expect, it } from 'vitest';
import { aplicacionDe, esVivo, estiloApagado, tocaElemento } from '@features/mel/helpers/aplicacion';

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

    it('un breakpoint encoge la pieza en vez de apagar nada', () => {
        const { demo, elementos } = aplicacionDe('breakpoint.md', '768px');
        expect(elementos).toEqual([]);
        expect(demo).toEqual({ tipo: 'ancho', valor: 768 });
    });

    it('el color de fondo apaga el contenido y deja el lienzo', () => {
        const { elementos } = aplicacionDe('color.bg', '#FFFFFF');
        expect(elementos).toEqual(['fondo']);
        expect(esVivo('titulo', elementos)).toBe(false);
        expect(esVivo('bajada', elementos)).toBe(false);
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
        expect(aplicacionDe('dataviz.seq.3', '#B98FC7').elementos).toEqual(['barras']);
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

describe('esVivo', () => {
    it('un elemento que no usa el token se apaga', () => {
        expect(esVivo('titulo', ['titulo'])).toBe(true);
        expect(esVivo('bajada', ['titulo'])).toBe(false);
    });

    it('un contenedor con un hijo vivo no se apaga, o lo arrastraria', () => {
        expect(esVivo('tarjetas', ['cifra'])).toBe(true);
        expect(esVivo('campo', ['cifra'])).toBe(true);
        expect(esVivo('tabla', ['filasTabla'])).toBe(true);
        expect(esVivo('grafica', ['barras'])).toBe(true);
    });

    it('si el contenedor es el elegido, sus hijos siguen vivos', () => {
        expect(esVivo('cifra', ['campo'])).toBe(true);
        expect(esVivo('nota', ['campo'])).toBe(true);
    });

    it('un hermano del vivo si se apaga', () => {
        expect(esVivo('tarjetaSombra', ['cifra'])).toBe(false);
        expect(esVivo('encabezadoTabla', ['filasTabla'])).toBe(false);
    });
});

describe('tocaElemento', () => {
    it('reconoce los tokens que pintan el elemento sobre el que se pasa', () => {
        expect(tocaElemento('color.primary', '#5C2472', 'titulo')).toBe(true);
        expect(tocaElemento('font.size.2xl', '2rem', 'titulo')).toBe(true);
        expect(tocaElemento('color.accent', '#FF8300', 'titulo')).toBe(false);
    });

    it('el boton primario lo tocan su color, su tamano y su radio', () => {
        expect(tocaElemento('color.primary', '#5C2472', 'botonPrimario')).toBe(true);
        expect(tocaElemento('font.size.base', '1rem', 'botonPrimario')).toBe(true);
        expect(tocaElemento('radius.md', '8px', 'botonPrimario')).toBe(true);
    });

    it('un token que apunta al contenedor tambien toca a sus hijos', () => {
        expect(tocaElemento('space.4', '1rem', 'botonPrimario')).toBe(true);
        expect(tocaElemento('color.surface-field', '#FAFAFA', 'cifra')).toBe(true);
    });

    it('sin elemento no toca nada', () => {
        expect(tocaElemento('color.primary', '#5C2472', null)).toBe(false);
    });
});
