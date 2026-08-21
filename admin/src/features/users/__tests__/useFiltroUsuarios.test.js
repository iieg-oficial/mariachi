import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useFiltroUsuarios, { PAGE_SIZE, SIN_PROYECTOS } from '@features/users/hooks/useFiltroUsuarios';

const usuario = (id, extra = {}) => ({
    id,
    username: `user${id}`,
    name: `Usuario ${String(id).padStart(2, '0')}`,
    email: `user${id}@test.com`,
    role: 'editora',
    projects: [],
    created_at: `2026-08-${String((id % 28) + 1).padStart(2, '0')}T10:00:00`,
    ...extra,
});

const muchos = (n) => Array.from({ length: n }, (_, i) => usuario(i + 1));

describe('useFiltroUsuarios', () => {
    it('pagina en bloques de PAGE_SIZE', () => {
        const { result } = renderHook(() => useFiltroUsuarios(muchos(30)));
        expect(result.current.visibles).toHaveLength(PAGE_SIZE);
        expect(result.current.total).toBe(30);
    });

    it('recorta la pagina cuando la lista encoge', () => {
        const { result, rerender } = renderHook(({ lista }) => useFiltroUsuarios(lista), {
            initialProps: { lista: muchos(25) },
        });
        act(() => result.current.setPagina(3));
        expect(result.current.visibles).toHaveLength(1);

        rerender({ lista: muchos(24) });
        expect(result.current.pagina).toBe(2);
        expect(result.current.visibles).toHaveLength(PAGE_SIZE);
    });

    it('busca por dependencia de SIEEJ', () => {
        const lista = [
            usuario(1, { role: 'externo', sieej_grupo: { id: 1, nombre: 'Secretaría de Salud' } }),
            usuario(2),
        ];
        const { result } = renderHook(() => useFiltroUsuarios(lista));
        act(() => result.current.setBusqueda('salud'));
        expect(result.current.visibles.map((u) => u.id)).toEqual([1]);
    });

    it('busca por nombre de proyecto', () => {
        const lista = [
            usuario(1, { projects: [{ slug: 'mapalab', name: 'MapaLab', project_role: 'editor' }] }),
            usuario(2),
        ];
        const { result } = renderHook(() => useFiltroUsuarios(lista));
        act(() => result.current.setBusqueda('mapalab'));
        expect(result.current.visibles.map((u) => u.id)).toEqual([1]);
    });

    it('filtra por proyecto e incluye a las administradoras', () => {
        const lista = [
            usuario(1, { projects: [{ slug: 'sieej', name: 'SIEEJ', project_role: 'editor' }] }),
            usuario(2),
            usuario(3, { role: 'tetlamamakani' }),
        ];
        const { result } = renderHook(() => useFiltroUsuarios(lista));
        act(() => result.current.setProyecto('sieej'));
        expect(result.current.visibles.map((u) => u.id)).toEqual([1, 3]);
    });

    it('el filtro "sin proyectos" excluye a las administradoras', () => {
        const lista = [
            usuario(1, { projects: [{ slug: 'sieej', name: 'SIEEJ', project_role: 'editor' }] }),
            usuario(2),
            usuario(3, { role: 'tetlamamakani' }),
        ];
        const { result } = renderHook(() => useFiltroUsuarios(lista));
        act(() => result.current.setProyecto(SIN_PROYECTOS));
        expect(result.current.visibles.map((u) => u.id)).toEqual([2]);
    });

    it('cambiar un filtro regresa a la primera pagina', () => {
        const { result } = renderHook(() => useFiltroUsuarios(muchos(30)));
        act(() => result.current.setPagina(2));
        expect(result.current.pagina).toBe(2);
        act(() => result.current.setRol('editora'));
        expect(result.current.pagina).toBe(1);
    });

    it('ordena por alta mas reciente', () => {
        const lista = [
            usuario(1, { created_at: '2026-01-05T10:00:00' }),
            usuario(2, { created_at: '2026-08-20T10:00:00' }),
        ];
        const { result } = renderHook(() => useFiltroUsuarios(lista));
        act(() => result.current.setOrden('recientes'));
        expect(result.current.visibles.map((u) => u.id)).toEqual([2, 1]);
    });
});
