import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useInfoboxUndo } from '@features/mapalab-layers/hooks/useInfoboxUndo';

const montar = (inicial) => {
    let valor = inicial;
    const onChange = vi.fn((v) => { valor = v; });
    const vista = renderHook(({ v }) => useInfoboxUndo(v, onChange), { initialProps: { v: inicial } });
    return {
        ...vista,
        onChange,
        valorActual: () => valor,
        set: (v) => act(() => { vista.rerender({ v }); }),
    };
};

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

describe('useInfoboxUndo', () => {
    it('sin cambios no hay nada que deshacer', () => {
        const t = montar({ headerField: 'a' });
        expect(t.result.current.canUndo).toBe(false);
        expect(t.result.current.canRedo).toBe(false);
    });

    it('deshace el cambio anterior', () => {
        const t = montar({ headerField: 'a' });
        vi.advanceTimersByTime(1000);
        t.set({ headerField: 'b' });
        expect(t.result.current.canUndo).toBe(true);
        act(() => t.result.current.undo());
        expect(t.onChange).toHaveBeenCalledWith({ headerField: 'a' });
    });

    it('agrupa los cambios seguidos en un solo paso', () => {
        const t = montar({ label: '' });
        vi.advanceTimersByTime(1000);
        t.set({ label: 'M' });
        t.set({ label: 'Mu' });
        t.set({ label: 'Mun' });
        act(() => t.result.current.undo());
        expect(t.onChange).toHaveBeenCalledWith({ label: '' });
    });

    it('separa los cambios que van espaciados', () => {
        const t = montar({ label: 'uno' });
        vi.advanceTimersByTime(1000);
        t.set({ label: 'dos' });
        vi.advanceTimersByTime(1000);
        t.set({ label: 'tres' });
        act(() => t.result.current.undo());
        expect(t.onChange).toHaveBeenLastCalledWith({ label: 'dos' });
    });

    it('rehace lo deshecho', () => {
        const t = montar({ headerField: 'a' });
        vi.advanceTimersByTime(1000);
        t.set({ headerField: 'b' });
        act(() => t.result.current.undo());
        t.set(t.valorActual());
        expect(t.result.current.canRedo).toBe(true);
        act(() => t.result.current.redo());
        expect(t.onChange).toHaveBeenLastCalledWith({ headerField: 'b' });
    });

    it('un cambio nuevo borra el futuro', () => {
        const t = montar({ headerField: 'a' });
        vi.advanceTimersByTime(1000);
        t.set({ headerField: 'b' });
        act(() => t.result.current.undo());
        t.set(t.valorActual());
        vi.advanceTimersByTime(1000);
        t.set({ headerField: 'c' });
        expect(t.result.current.canRedo).toBe(false);
    });
});
