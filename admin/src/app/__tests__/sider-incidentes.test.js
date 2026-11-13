import { describe, it, expect } from 'vitest';
import { buildSiderItems } from '@app/sider-config';

const noop = () => {};

const conPermisos = (permisos) => {
    const set = new Set(permisos);
    return { user: { permissions: permisos }, can: (p) => set.has(p) };
};

describe('Huachicol con solo incidentes', () => {
    it('abre el grupo y solo habilita Incidentes', () => {
        const items = buildSiderItems({ ...conPermisos(['mariachi.incidentes.view']), onNavigate: noop });
        const grupo = items.find((i) => i.key === 'group-huachicol');
        expect(grupo.disabled).toBe(false);
        const habilitados = grupo.children.filter((c) => !c.disabled).map((c) => c.key);
        expect(habilitados).toEqual(['/huachicol/incidentes']);
    });

    it('con actividad pero sin incidentes, Incidentes queda deshabilitado', () => {
        const items = buildSiderItems({ ...conPermisos(['mariachi.actividad.view']), onNavigate: noop });
        const grupo = items.find((i) => i.key === 'group-huachicol');
        const incidentes = grupo.children.find((c) => c.key === '/huachicol/incidentes');
        expect(incidentes.disabled).toBe(true);
    });
});
