import { describe, expect, it } from 'vitest';
import { nombresPorId, opcionesDeArbol, textoDeConteo } from './arbolOpciones';

const arbol = [{ id: 't', label: 'Tema', children: [{ id: 'c', label: 'Capa', privada: true, children: [] }] }];

describe('arbolOpciones', () => {
    it('arma las opciones del TreeSelect con la marca de privada', () => {
        const [tema] = opcionesDeArbol(arbol);
        expect(tema).toMatchObject({ value: 't', title: 'Tema', privada: false });
        expect(tema.children[0]).toMatchObject({ value: 'c', privada: true, children: undefined });
    });

    it('indexa los nombres por id', () => {
        expect(nombresPorId(arbol)).toEqual({ t: 'Tema', c: 'Capa' });
    });

    it('cuenta en singular y plural', () => {
        expect(textoDeConteo(1, 'persona', 'personas')).toBe('1 persona');
        expect(textoDeConteo(3, 'persona', 'personas')).toBe('3 personas');
    });
});
