import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useGeoserverSelection, {
    resourceKey,
    toResourceRef,
} from '@features/sextante/hooks/useGeoserverSelection';

const archivo = (name, workspace = '') => ({ name, workspace, isDir: false });
const carpeta = (path) => ({ name: path.split('/').pop(), path, isDir: true });

describe('resourceKey', () => {
    it('distingue una carpeta de un archivo con el mismo nombre', () => {
        expect(resourceKey(carpeta('iconos'))).not.toBe(resourceKey(archivo('iconos')));
    });

    it('distingue el mismo archivo en workspaces distintos', () => {
        expect(resourceKey(archivo('logo.svg', 'a'))).not.toBe(resourceKey(archivo('logo.svg', 'b')));
    });
});

describe('toResourceRef', () => {
    it('manda la ruta completa de una carpeta, no su nombre', () => {
        expect(toResourceRef(carpeta('a/b'))).toEqual({ name: 'a/b', workspace: '', isDir: true });
    });

    it('normaliza el workspace ausente a cadena vacia', () => {
        expect(toResourceRef({ name: 'logo.svg' }).workspace).toBe('');
    });
});

describe('useGeoserverSelection', () => {
    it('arranca sin seleccion', () => {
        const { result } = renderHook(() => useGeoserverSelection());
        expect(result.current.count).toBe(0);
        expect(result.current.selected).toEqual([]);
    });

    it('toggle agrega y quita el mismo recurso', () => {
        const { result } = renderHook(() => useGeoserverSelection());
        act(() => result.current.toggle(archivo('logo.svg')));
        expect(result.current.count).toBe(1);
        expect(result.current.isSelected(archivo('logo.svg'))).toBe(true);
        act(() => result.current.toggle(archivo('logo.svg')));
        expect(result.current.count).toBe(0);
    });

    it('mezcla archivos y carpetas en la misma seleccion', () => {
        const { result } = renderHook(() => useGeoserverSelection());
        act(() => result.current.toggle(archivo('logo.svg')));
        act(() => result.current.toggle(carpeta('iconos')));
        expect(result.current.count).toBe(2);
        expect(result.current.selected.filter((it) => it.isDir)).toHaveLength(1);
    });

    it('clear vacia la seleccion, como al cambiar de carpeta', () => {
        const { result } = renderHook(() => useGeoserverSelection());
        act(() => result.current.toggle(archivo('logo.svg')));
        act(() => result.current.toggle(carpeta('iconos')));
        expect(result.current.count).toBe(2);
        act(() => result.current.clear());
        expect(result.current.count).toBe(0);
    });
});
