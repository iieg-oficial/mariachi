import { describe, it, expect, vi } from 'vitest';
import { buildSiderItems, defaultOpenKeyForPath } from '@app/sider-config';

const noop = () => {};

describe('buildSiderItems', () => {
    it('devuelve [] cuando no hay user', () => {
        expect(buildSiderItems({ user: null, onNavigate: noop })).toEqual([]);
        expect(buildSiderItems({ user: undefined, onNavigate: noop })).toEqual([]);
    });

    it('admin (tetlamamakani) ve grupo Plataforma + 3 grupos de proyecto', () => {
        const items = buildSiderItems({
            user: { role: 'tetlamamakani', projects: [] },
            onNavigate: noop,
        });
        expect(items).toHaveLength(4);
        expect(items[0].key).toBe('platform');
        expect(items[0].label).toBe('Plataforma');
        expect(items[0].children).toHaveLength(3);

        const projectKeys = items.slice(1).map((i) => i.key);
        expect(projectKeys).toContain('project-portal');
        expect(projectKeys).toContain('project-mapalab');
        expect(projectKeys).toContain('project-sieej');
    });

    it('admin sin children de plataforma (caso teórico) sigue viendo proyectos', () => {
        const items = buildSiderItems({
            user: { role: 'tetlamamakani', projects: [] },
            onNavigate: noop,
        });
        expect(items.find((i) => i.key === 'platform').children.map((c) => c.key)).toEqual([
            '/users',
            '/media',
            '/revision',
        ]);
    });

    it('editora con membership en portal solo ve Plataforma (Media) + Portalito', () => {
        const items = buildSiderItems({
            user: {
                role: 'editora',
                projects: [{ slug: 'portal', name: 'Portal', project_role: 'editor' }],
            },
            onNavigate: noop,
        });
        expect(items).toHaveLength(2);

        const platform = items.find((i) => i.key === 'platform');
        expect(platform).toBeDefined();
        expect(platform.children.map((c) => c.key)).toEqual(['/media']);

        const portal = items.find((i) => i.key === 'project-portal');
        expect(portal).toBeDefined();
        expect(portal.children.map((c) => c.key)).toEqual(['/menu', '/pages']);

        expect(items.find((i) => i.key === 'project-mapalab')).toBeUndefined();
        expect(items.find((i) => i.key === 'project-sieej')).toBeUndefined();
    });

    it('editora sin memberships solo ve Plataforma con Media', () => {
        const items = buildSiderItems({
            user: { role: 'editora', projects: [] },
            onNavigate: noop,
        });
        expect(items).toHaveLength(1);
        expect(items[0].key).toBe('platform');
        expect(items[0].children.map((c) => c.key)).toEqual(['/media']);
    });

    it('editora con membership en mapalab y sieej ve ambos grupos', () => {
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
        const keys = items.map((i) => i.key);
        expect(keys).toContain('platform');
        expect(keys).toContain('project-mapalab');
        expect(keys).toContain('project-sieej');
        expect(keys).not.toContain('project-portal');
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
        expect(defaultOpenKeyForPath('/media')).toBe('platform');
        expect(defaultOpenKeyForPath('/')).toBe('platform');
    });
});
