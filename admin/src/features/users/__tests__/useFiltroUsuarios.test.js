import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useFiltroUsuarios, { BLOQUE, SIN_PROYECTOS } from '@features/users/hooks/useFiltroUsuarios';

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
    it('arranca mostrando un bloque y avisa que hay mas', () => {
        const { result } = renderHook(() => useFiltroUsuarios(muchos(BLOQUE + 5)));
        expect(result.current.visibles).toHaveLength(BLOQUE);
        expect(result.current.total).toBe(BLOQUE + 5);
        expect(result.current.hayMas).toBe(true);
    });

    it('verMas agrega otro bloque hasta agotar la lista', () => {
        const { result } = renderHook(() => useFiltroUsuarios(muchos(BLOQUE + 5)));
        act(() => result.current.verMas());
        expect(result.current.visibles).toHaveLength(BLOQUE + 5);
        expect(result.current.hayMas).toBe(false);
    });

    it('la ventana se ajusta sola cuando la lista encoge', () => {
        const { result, rerender } = renderHook(({ lista }) => useFiltroUsuarios(lista), {
            initialProps: { lista: muchos(BLOQUE * 2) },
        });
        act(() => result.current.verMas());
        expect(result.current.visibles).toHaveLength(BLOQUE * 2);

        rerender({ lista: muchos(3) });
        expect(result.current.visibles).toHaveLength(3);
        expect(result.current.hayMas).toBe(false);
    });

    it('ordena por nombre sin que haya que pedirlo', () => {
        const lista = [usuario(2, { name: 'Zulema Ruiz' }), usuario(1, { name: 'Ana Perez' })];
        const { result } = renderHook(() => useFiltroUsuarios(lista));
        expect(result.current.visibles.map((u) => u.name)).toEqual(['Ana Perez', 'Zulema Ruiz']);
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

    it('cambiar un filtro vuelve a mostrar solo el primer bloque', () => {
        const { result } = renderHook(() => useFiltroUsuarios(muchos(BLOQUE * 3)));
        act(() => result.current.verMas());
        expect(result.current.visibles).toHaveLength(BLOQUE * 2);
        act(() => result.current.setRol('editora'));
        expect(result.current.visibles).toHaveLength(BLOQUE);
    });

});
