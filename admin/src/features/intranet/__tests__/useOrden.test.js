import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

vi.mock('../api/intranetService', () => ({ actualizar: vi.fn() }));
vi.mock('antd', () => ({ message: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

import { message } from 'antd';
import { actualizar } from '../api/intranetService';
import { useOrden } from '../hooks/useOrden';

const ENLACES = [
    { id: 1, seccion: 'IIEG', etiqueta: 'Transparencia', orden: 1 },
    { id: 2, seccion: 'IIEG', etiqueta: 'Contacto', orden: 2 },
    { id: 3, seccion: 'IIEG', etiqueta: 'Avisos', orden: 3 },
    { id: 4, seccion: 'Accesos', etiqueta: 'Vine', orden: 1 },
];

beforeEach(() => vi.clearAllMocks());

describe('useOrden', () => {
    it('ordena por sección y orden, y al soltar guarda solo las filas que cambiaron', async () => {
        const recargar = vi.fn();
        const { result } = renderHook(() => useOrden('enlaces', { campo: 'orden', grupo: 'seccion' }, ENLACES, recargar));
        expect(result.current.visibles.map((f) => f.id)).toEqual([4, 1, 2, 3]);
        await act(() => result.current.soltar({ active: { id: 3 }, over: { id: 1 } }));
        expect(actualizar.mock.calls).toEqual([
            ['enlaces', 3, { orden: 1 }],
            ['enlaces', 1, { orden: 2 }],
            ['enlaces', 2, { orden: 3 }],
        ]);
        expect(message.success).toHaveBeenCalledWith('Orden guardado');
        expect(recargar).toHaveBeenCalled();
    });

    it('no mueve una fila a otra sección', async () => {
        const { result } = renderHook(() => useOrden('enlaces', { campo: 'orden', grupo: 'seccion' }, ENLACES, vi.fn()));
        await act(() => result.current.soltar({ active: { id: 4 }, over: { id: 2 } }));
        expect(actualizar).not.toHaveBeenCalled();
        expect(message.warning).toHaveBeenCalled();
    });

    it('usa el payload propio del recurso', async () => {
        const carpetas = [{ id: 7, nombre: 'A', descripcion: null, orden: 0 }, { id: 8, nombre: 'B', descripcion: 'x', orden: 0 }];
        const aPayload = (carpeta, valor) => ({ nombre: carpeta.nombre, orden: valor });
        const { result } = renderHook(() => useOrden('carpetas', { campo: 'orden', aPayload }, carpetas, vi.fn()));
        await act(() => result.current.soltar({ active: { id: 8 }, over: { id: 7 } }));
        expect(actualizar.mock.calls).toEqual([['carpetas', 8, { nombre: 'B', orden: 1 }], ['carpetas', 7, { nombre: 'A', orden: 2 }]]);
    });
});
