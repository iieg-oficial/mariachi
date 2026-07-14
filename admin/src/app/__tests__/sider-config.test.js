import { describe, it, expect, vi } from 'vitest';
import { buildSiderItems, defaultOpenKeyForPath, selectedKeyForPath } from '@app/sider-config';

const noop = () => {};

describe('buildSiderItems', () => {
    it('devuelve [] cuando no hay user', () => {
        expect(buildSiderItems({ user: null, onNavigate: noop })).toEqual([]);
        expect(buildSiderItems({ user: undefined, onNavigate: noop })).toEqual([]);
    });

    it('admin (tetlamamakani) ve Inicio + grupo Plataforma + grupos de proyecto', () => {
        const items = buildSiderItems({
            user: { role: 'tetlamamakani', projects: [] },
            onNavigate: noop,
        });
        expect(items[0].key).toBe('/inicio');
        expect(items[1].key).toBe('platform');
        expect(items[1].label).toBe('Plataforma');
        expect(items[1].children).toHaveLength(4);

        const projectKeys = items.slice(2).map((i) => i.key);
        expect(projectKeys).toContain('project-portal');
        expect(projectKeys).toContain('project-mapalab');
        expect(projectKeys).toContain('project-sieej');
    });

    it('admin ve Plataforma con /users, /media, /revision, /actividad (incluye actividad post-US#148)', () => {
        const items = buildSiderItems({
            user: { role: 'tetlamamakani', projects: [] },
            onNavigate: noop,
        });
        expect(items.find((i) => i.key === 'platform').children.map((c) => c.key)).toEqual([
            '/users',
            '/acervo',
            '/revision',
            '/actividad',
        ]);
    });

    it('editora ve TODOS los platform items pero los exclusivos de admin estan disabled (sider con candado v0.47.2)', () => {
        const items = buildSiderItems({
            user: {
                role: 'editora',
                projects: [{ slug: 'portal', name: 'Portal', project_role: 'editor' }],
            },
            onNavigate: noop,
        });
        const platform = items.find((i) => i.key === 'platform');
        const platformByKey = Object.fromEntries(platform.children.map((c) => [c.key, c]));

        expect(Object.keys(platformByKey)).toEqual(['/users', '/acervo', '/revision', '/actividad']);
        expect(platformByKey['/acervo'].disabled).toBeFalsy();
        expect(platformByKey['/users'].disabled).toBe(true);
        expect(platformByKey['/revision'].disabled).toBe(true);
        expect(platformByKey['/actividad'].disabled).toBe(true);
    });

    it('editora con portal ve portal accesible y mapalab/sieej deshabilitados con candado', () => {
        const items = buildSiderItems({
            user: {
                role: 'editora',
                projects: [{ slug: 'portal', name: 'Portal', project_role: 'editor' }],
            },
            onNavigate: noop,
        });
        const portal = items.find((i) => i.key === 'project-portal');
        const mapalab = items.find((i) => i.key === 'project-mapalab');
        const sieej = items.find((i) => i.key === 'project-sieej');
        expect(portal.disabled).toBe(true);
        expect(mapalab.disabled).toBe(true);
        expect(sieej.disabled).toBe(true);
    });

    it('editora sin memberships ve Inicio + Plataforma (Media accesible, resto con candado)', () => {
        const items = buildSiderItems({
            user: { role: 'editora', projects: [] },
            onNavigate: noop,
        });
        expect(items[0].key).toBe('/inicio');
        expect(items[1].key).toBe('platform');
        const accesibles = items[1].children.filter((c) => !c.disabled).map((c) => c.key);
        expect(accesibles).toEqual(['/acervo']);
    });

    it('editora con membership en mapalab y sieej accede a ambos sin candado', () => {
        const items = buildSiderItems({
            user: {
                role: 'editora',
                projects: [
                    { slug: 'mapalab', name: 'MapaLab', project_role: 'viewer' },
                    { slug: 'sieej', name: 'SIEEJ', project_role: 'editor' },
                ],
            },
            onNavigate: noop,
        });
        const mapalab = items.find((i) => i.key === 'project-mapalab');
        const sieej = items.find((i) => i.key === 'project-sieej');
        const portal = items.find((i) => i.key === 'project-portal');
        expect(mapalab.disabled).toBeFalsy();
        expect(sieej.disabled).toBeFalsy();
        expect(portal.disabled).toBe(true);
    });

    it('onClick en hijos invoca onNavigate con el path correcto', () => {
        const onNavigate = vi.fn();
        const items = buildSiderItems({
            user: { role: 'tetlamamakani', projects: [] },
            onNavigate,
        });
        const platform = items.find((i) => i.key === 'platform');
        platform.children[0].onClick();
        expect(onNavigate).toHaveBeenCalledWith('/users');
    });

    it('proyecto con disabled:true se renderiza con flag disabled y sus hijos no tienen onClick', () => {
        const items = buildSiderItems({
            user: { role: 'tetlamamakani', projects: [] },
            onNavigate: vi.fn(),
        });
        const portal = items.find((i) => i.key === 'project-portal');
        expect(portal.disabled).toBe(true);
        portal.children.forEach((c) => {
            expect(c.disabled).toBe(true);
            expect(c.onClick).toBeUndefined();
        });
    });

    it('items de SIEEJ son Formularios, Grupos y Catálogos (sin item disabled)', () => {
        const items = buildSiderItems({
            user: { role: 'tetlamamakani', projects: [] },
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

    it('item /inicio dispara onNavigate al click', () => {
        const onNavigate = vi.fn();
        const items = buildSiderItems({
            user: { role: 'editora', projects: [] },
            onNavigate,
        });
        const inicio = items.find((i) => i.key === '/inicio');
        expect(inicio).toBeDefined();
        inicio.onClick();
        expect(onNavigate).toHaveBeenCalledWith('/inicio');
    });

    it('badge de revisiones aparece cuando pendingCount > 0', () => {
        const items = buildSiderItems({
            user: { role: 'tetlamamakani', projects: [] },
            onNavigate: noop,
            extras: { pendingCount: 5 },
        });
        const platform = items.find((i) => i.key === 'platform');
        const revision = platform.children.find((c) => c.key === '/revision');
        expect(revision).toBeDefined();
        expect(revision.label).not.toBe('Revisiones');
    });
});

describe('defaultOpenKeyForPath', () => {
    it('devuelve project-portal para /pages/edit/1', () => {
        expect(defaultOpenKeyForPath('/pages/edit/1')).toBe('project-portal');
    });

    it('devuelve project-mapalab para /mapalab/layers', () => {
        expect(defaultOpenKeyForPath('/mapalab/layers')).toBe('project-mapalab');
    });

    it('devuelve project-sieej para /sieej/formularios', () => {
        expect(defaultOpenKeyForPath('/sieej/formularios')).toBe('project-sieej');
    });

    it('devuelve platform para rutas no asociadas a un proyecto', () => {
        expect(defaultOpenKeyForPath('/users')).toBe('platform');
        expect(defaultOpenKeyForPath('/acervo')).toBe('platform');
        expect(defaultOpenKeyForPath('/')).toBe('platform');
    });
});

describe('selectedKeyForPath', () => {
    it('coincide exactamente con un item del sider', () => {
        expect(selectedKeyForPath('/inicio')).toBe('/inicio');
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
