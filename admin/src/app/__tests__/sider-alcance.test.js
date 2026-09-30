import { describe, it, expect } from 'vitest';
import { alcanceDePath, buildSiderItems } from '@app/sider-config';
import { ALCANCE_EN_LINEA, ALCANCE_LOCAL } from '@app/sider-alcance';

const noop = () => {};
const conTodo = { user: { permissions: [] }, can: () => true, onNavigate: noop };
const llaves = (alcance) => buildSiderItems({ ...conTodo, alcance }).map((item) => item.key);

describe('buildSiderItems por alcance', () => {
    it('en línea es el default y no trae los proyectos locales', () => {
        const keys = buildSiderItems(conTodo).map((item) => item.key);
        expect(keys).toEqual(llaves(ALCANCE_EN_LINEA));
        expect(keys).toContain('project-mapalab');
        expect(keys).not.toContain('project-frames');
        expect(keys).not.toContain('project-vine');
    });

    it('local trae Inicio y los proyectos locales, nada más', () => {
        const keys = llaves(ALCANCE_LOCAL);
        expect(keys[0]).toBe('/inicio');
        expect(keys).toContain('project-frames');
        expect(keys).toContain('project-intranet');
        expect(keys).not.toContain('/users');
        expect(keys).not.toContain('group-acervo');
        expect(keys).not.toContain('project-mapalab');
    });

    it('Inicio sale en los dos menús', () => {
        expect(llaves(ALCANCE_EN_LINEA)).toContain('/inicio');
        expect(llaves(ALCANCE_LOCAL)).toContain('/inicio');
    });
});

describe('alcanceDePath', () => {
    it('reconoce las rutas locales', () => {
        expect(alcanceDePath('/frames/camaras')).toBe(ALCANCE_LOCAL);
        expect(alcanceDePath('/intranet/carrusel')).toBe(ALCANCE_LOCAL);
        expect(alcanceDePath('/frames/vivo/3')).toBe(ALCANCE_LOCAL);
    });

    it('reconoce las rutas en línea, también las hijas de un grupo', () => {
        expect(alcanceDePath('/mapalab/layers')).toBe(ALCANCE_EN_LINEA);
        expect(alcanceDePath('/acervo/buckets')).toBe(ALCANCE_EN_LINEA);
        expect(alcanceDePath('/users')).toBe(ALCANCE_EN_LINEA);
    });

    it('no decide en rutas compartidas o fuera del menú', () => {
        expect(alcanceDePath('/inicio')).toBeNull();
        expect(alcanceDePath('/perfil')).toBeNull();
        expect(alcanceDePath('/documentacion')).toBeNull();
    });

    it('no confunde prefijos parecidos', () => {
        expect(alcanceDePath('/framesx')).toBeNull();
    });
});
