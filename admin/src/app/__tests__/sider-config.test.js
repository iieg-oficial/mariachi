import { describe, it, expect, vi } from 'vitest';
import {
    buildSiderFooterRail,
    buildSiderItems,
    defaultOpenKeyForPath,
    selectedKeyForPath,
} from '@app/sider-config';

const noop = () => {};

const TODOS = [
    'mariachi.usuarios.view',
    'mariachi.acervo.view',
    'mariachi.acervo.manage',
    'mariachi.actividad.view',
    'mariachi.mapalab.view',
    'mariachi.mapalab.update',
    'mariachi.mapalab.manage',
    'mariachi.mapalab_llaves.manage',
    'mariachi.mapalab_propuestas.approve',
    'mariachi.geoserver.view',
    'mariachi.geoserver.manage',
    'mariachi.sieej_admin.view',
    'mariachi.mel.view',
    'mariachi.colibri_reportes.view',
    'mariachi.colibri_config.manage',
];

const conPermisos = (permisos) => {
    const set = new Set(permisos);
    return { user: { permissions: permisos }, can: (p) => set.has(p) };
};

describe('buildSiderItems', () => {
    it('devuelve [] cuando no hay user', () => {
        expect(buildSiderItems({ user: null, can: () => true, onNavigate: noop })).toEqual([]);
        expect(buildSiderItems({ user: undefined, can: () => true, onNavigate: noop })).toEqual([]);
    });

    it('con todos los permisos ve Inicio, Usuarios, Acervo y Huachicol, luego proyectos', () => {
        const items = buildSiderItems({
            ...conPermisos(TODOS),
            onNavigate: noop,
        });
        expect(items[0].key).toBe('/inicio');
        expect(items[1].key).toBe('/users');
        expect(items[2].key).toBe('group-acervo');
        expect(items[2].children.map((c) => c.key)).toEqual(['/acervo', '/acervo/buckets']);
        expect(items[3].key).toBe('group-huachicol');
        expect(items[3].label).toBe('Huachicol');
        expect(items[3].children.map((c) => c.key)).toEqual([
            '/huachicol/observabilidad',
            '/huachicol/servidores',
            '/huachicol/telemetria',
            '/huachicol/actividad',
        ]);

        const keys = items.map((i) => i.key);
        expect(keys).not.toContain('platform');

        const projectKeys = items.slice(4).map((i) => i.key);
        expect(projectKeys[0]).toBe('project-sextante');
        expect(projectKeys).toContain('project-mapalab');
        expect(projectKeys).toContain('project-sieej');
        expect(projectKeys).not.toContain('project-portal');
        expect(projectKeys).not.toContain('project-tablerillos');
    });

    it('Sextante agrupa lo de GeoServer; workspaces y simbolos piden su propio permiso', () => {
        const items = buildSiderItems({
            ...conPermisos(['mariachi.geoserver.view']),
            onNavigate: noop,
        });
        const sextante = items.find((i) => i.key === 'project-sextante');
        expect(sextante.disabled).toBeFalsy();
        expect(sextante.children.map((c) => c.key)).toEqual([
            '/sextante/workspaces',
            '/sextante/capas',
            '/sextante/estilos',
            '/sextante/recursos',
            '/sextante/tipografias',
            '/sextante/simbolos',
        ]);
        const byKey = Object.fromEntries(sextante.children.map((c) => [c.key, c]));
        expect(byKey['/sextante/workspaces'].disabled).toBe(true);
        expect(byKey['/sextante/simbolos'].disabled).toBe(true);
        expect(byKey['/sextante/recursos'].disabled).toBeFalsy();
    });

    it('sin permiso de geoserver, Sextante queda deshabilitado', () => {
        const items = buildSiderItems({
            ...conPermisos([]),
            onNavigate: noop,
        });
        expect(items.find((i) => i.key === 'project-sextante').disabled).toBe(true);
    });

    it('MapaLab ya no lista Símbolos ni Recursos GeoServer', () => {
        const items = buildSiderItems({
            ...conPermisos(TODOS),
            onNavigate: noop,
        });
        const mapalab = items.find((i) => i.key === 'project-mapalab');
        const keys = mapalab.children.map((c) => c.key);
        expect(keys).not.toContain('/mapalab/simbolos');
        expect(keys).not.toContain('/mapalab/recursos-geoserver');
    });

    it('Acervo: con acervo.manage se ven Media y Buckets habilitados', () => {
        const items = buildSiderItems({
            ...conPermisos(TODOS),
            onNavigate: noop,
        });
        const acervo = items.find((i) => i.key === 'group-acervo');
        acervo.children.forEach((c) => {
            expect(c.disabled).toBeFalsy();
            expect(c.onClick).toBeDefined();
        });
    });

    it('Usuarios y Huachicol piden su permiso; con solo acervo.view, Acervo no', () => {
        const items = buildSiderItems({
            ...conPermisos(['mariachi.acervo.view']),
            onNavigate: noop,
        });
        const byKey = Object.fromEntries(items.map((i) => [i.key, i]));
        expect(byKey['/users'].disabled).toBe(true);
        expect(byKey['group-huachicol'].disabled).toBe(true);
        expect(byKey['group-acervo'].disabled).toBeFalsy();
    });

    it('Acervo: con acervo.view se ve Media pero Buckets deshabilitado', () => {
        const items = buildSiderItems({
            ...conPermisos(['mariachi.acervo.view']),
            onNavigate: noop,
        });
        const acervo = items.find((i) => i.key === 'group-acervo');
        const byKey = Object.fromEntries(acervo.children.map((c) => [c.key, c]));
        expect(byKey['/acervo'].disabled).toBeFalsy();
        expect(byKey['/acervo/buckets'].disabled).toBe(true);
    });

    it('con los permisos de mapalab y sieej se accede a ambos sin candado', () => {
        const items = buildSiderItems({
            ...conPermisos(['mariachi.mapalab.view', 'mariachi.sieej_admin.view']),
            onNavigate: noop,
        });
        const mapalab = items.find((i) => i.key === 'project-mapalab');
        const sieej = items.find((i) => i.key === 'project-sieej');
        expect(mapalab.disabled).toBeFalsy();
        expect(sieej.disabled).toBeFalsy();
    });

    it('sin esos permisos, mapalab y sieej quedan deshabilitados con candado', () => {
        const items = buildSiderItems({
            ...conPermisos([]),
            onNavigate: noop,
        });
        const mapalab = items.find((i) => i.key === 'project-mapalab');
        const sieej = items.find((i) => i.key === 'project-sieej');
        expect(mapalab.disabled).toBe(true);
        expect(sieej.disabled).toBe(true);
    });

    it('items de SIEEJ son Formularios, Grupos y Catálogos (sin item disabled)', () => {
        const items = buildSiderItems({
            ...conPermisos(TODOS),
            onNavigate: vi.fn(),
        });
        const sieej = items.find((i) => i.key === 'project-sieej');
        expect(sieej.disabled).toBeFalsy();
        expect(sieej.children.map((c) => c.key)).toEqual([
            '/sieej/formularios',
            '/sieej/grupos',
            '/sieej/catalogos',
        ]);
        sieej.children.forEach((c) => {
            expect(c.disabled).toBeFalsy();
            expect(c.onClick).toBeDefined();
        });
    });

    it('items principales disparan onNavigate al click', () => {
        const onNavigate = vi.fn();
        const items = buildSiderItems({
            ...conPermisos(TODOS),
            onNavigate,
        });
        items.find((i) => i.key === '/inicio').onClick();
        expect(onNavigate).toHaveBeenCalledWith('/inicio');
        const huachicol = items.find((i) => i.key === 'group-huachicol');
        huachicol.children.find((c) => c.key === '/huachicol/observabilidad').onClick();
        expect(onNavigate).toHaveBeenCalledWith('/huachicol/observabilidad');
        const acervo = items.find((i) => i.key === 'group-acervo');
        acervo.children.find((c) => c.key === '/acervo').onClick();
        expect(onNavigate).toHaveBeenCalledWith('/acervo');
    });

});

describe('buildSiderFooterRail', () => {
    it('con mapalab.manage ve Documentación y Revisiones en la fila', () => {
        const rail = buildSiderFooterRail({
            ...conPermisos(TODOS),
            onNavigate: noop,
        });
        expect(rail.map((i) => i.key)).toEqual(['/documentacion', '/revision']);
    });

    it('sin ese permiso solo ve Documentación, que no pide ninguno', () => {
        const rail = buildSiderFooterRail({
            ...conPermisos([]),
            onNavigate: noop,
        });
        expect(rail.map((i) => i.key)).toEqual(['/documentacion']);
    });

    it('el badge de revisiones refleja pendingCount', () => {
        const rail = buildSiderFooterRail({
            ...conPermisos(TODOS),
            onNavigate: noop,
            extras: { pendingCount: 5 },
        });
        const revision = rail.find((i) => i.key === '/revision');
        expect(revision.badgeCount).toBe(5);
    });

    it('onClick invoca onNavigate con el path', () => {
        const onNavigate = vi.fn();
        const rail = buildSiderFooterRail({
            ...conPermisos(TODOS),
            onNavigate,
        });
        rail.find((i) => i.key === '/revision').onClick();
        expect(onNavigate).toHaveBeenCalledWith('/revision');
    });

    it('devuelve [] cuando no hay user', () => {
        expect(buildSiderFooterRail({ user: null, can: () => true, onNavigate: noop })).toEqual([]);
    });
});

describe('defaultOpenKeyForPath', () => {
    it('devuelve project-mapalab para /mapalab/layers', () => {
        expect(defaultOpenKeyForPath('/mapalab/layers')).toBe('project-mapalab');
    });

    it('devuelve project-sieej para /sieej/formularios', () => {
        expect(defaultOpenKeyForPath('/sieej/formularios')).toBe('project-sieej');
    });

    it('devuelve project-sextante para rutas de sextante', () => {
        expect(defaultOpenKeyForPath('/sextante/estilos')).toBe('project-sextante');
        expect(defaultOpenKeyForPath('/sextante/simbolos')).toBe('project-sextante');
    });

    it('devuelve group-acervo para rutas de acervo', () => {
        expect(defaultOpenKeyForPath('/acervo')).toBe('group-acervo');
        expect(defaultOpenKeyForPath('/acervo/buckets')).toBe('group-acervo');
    });

    it('devuelve null para rutas no asociadas a un proyecto', () => {
        expect(defaultOpenKeyForPath('/users')).toBeNull();
        expect(defaultOpenKeyForPath('/')).toBeNull();
    });
});

describe('selectedKeyForPath', () => {
    it('coincide exactamente con un item del sider', () => {
        expect(selectedKeyForPath('/inicio')).toBe('/inicio');
        expect(selectedKeyForPath('/huachicol/observabilidad')).toBe('/huachicol/observabilidad');
        expect(selectedKeyForPath('/acervo')).toBe('/acervo');
        expect(selectedKeyForPath('/mapalab/eventos')).toBe('/mapalab/eventos');
    });

    it('resalta el item base en rutas de detalle', () => {
        expect(selectedKeyForPath('/mapalab/eventos/123/edit')).toBe('/mapalab/eventos');
        expect(selectedKeyForPath('/sieej/formularios/5')).toBe('/sieej/formularios');
        expect(selectedKeyForPath('/mapalab/layers/5/edit')).toBe('/mapalab/layers');
    });

    it('prefiere el prefijo mas largo cuando hay items anidados', () => {
        expect(selectedKeyForPath('/mapalab/layers/ingesta-masiva')).toBe('/mapalab/layers/ingesta-masiva');
    });

    it('devuelve el pathname cuando no hay item que coincida', () => {
        expect(selectedKeyForPath('/perfil')).toBe('/perfil');
        expect(selectedKeyForPath('/ruta-inexistente')).toBe('/ruta-inexistente');
    });
});

describe('Frames y los permisos', () => {
    const local = { alcance: 'local' };

    it('sin mariachi.frames.view el proyecto queda deshabilitado y sin onClick', () => {
        const { user, can } = conPermisos([]);
        const items = buildSiderItems({ user, can, onNavigate: noop, ...local });
        const frames = items.find((i) => i.key === 'project-frames');
        expect(frames).toBeDefined();
        expect(frames.disabled).toBe(true);
        frames.children.forEach((hijo) => {
            expect(hijo.disabled).toBe(true);
            expect(hijo.onClick).toBeUndefined();
        });
    });

    it('con mariachi.frames.view se puede entrar', () => {
        const { user, can } = conPermisos(['mariachi.frames.view']);
        const items = buildSiderItems({ user, can, onNavigate: noop, ...local });
        const frames = items.find((i) => i.key === 'project-frames');
        expect(frames.disabled).toBeFalsy();
        expect(frames.children.every((h) => typeof h.onClick === 'function')).toBe(true);
    });
});

describe('Frames: ver no es administrar', () => {
    const local = { alcance: 'local' };

    it('mariachi.frames.view abre la seccion pero no concede manage', () => {
        const { user, can } = conPermisos(['mariachi.frames.view']);
        const items = buildSiderItems({ user, can, onNavigate: noop, ...local });
        expect(items.find((i) => i.key === 'project-frames').disabled).toBeFalsy();
        expect(can('mariachi.frames.manage')).toBe(false);
    });
});
