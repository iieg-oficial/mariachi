import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import FechaPorContratoAction from '@features/mapalab-layers/components/FechaPorContratoAction';
import {
    CONTRACT_DATE_COLUMN,
    candidatasPorContrato,
} from '@features/mapalab-layers/utils/columnaFecha';

const ROWS = [
    { id: 'robos', label: 'Robos', fecha_contrato: true, date_column: null, workspace_alias: 'seguridad' },
    { id: 'motos', label: 'Motos', fecha_contrato: true, date_column: 'fecha_periodo_seleccion' },
    { id: 'eventos', label: 'Eventos', fecha_contrato: false, date_column: null },
    { id: 'asegurados', label: 'Asegurados', fecha_contrato: true, date_column: '  ' },
];

describe('FechaPorContratoAction', () => {
    it('solo propone capas con la columna del contrato y sin columna configurada', () => {
        expect(candidatasPorContrato(ROWS).map((row) => row.id)).toEqual(['robos', 'asegurados']);
    });

    it('marca las celdas como cambios pendientes sin guardar', () => {
        const applyPatches = vi.fn();
        render(<FechaPorContratoAction data={ROWS} applyPatches={applyPatches} />);

        fireEvent.click(screen.getByRole('button', { name: /Fecha por contrato/ }));
        expect(screen.getByText('Robos')).toBeTruthy();
        expect(screen.queryByText('Eventos')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: /Marcar 2 celdas/ }));
        expect(applyPatches).toHaveBeenCalledWith([
            { rowKey: 'robos', column: 'date_column', value: CONTRACT_DATE_COLUMN },
            { rowKey: 'asegurados', column: 'date_column', value: CONTRACT_DATE_COLUMN },
        ]);
    });

    it('sin candidatas no deja marcar nada', () => {
        render(<FechaPorContratoAction data={[ROWS[1]]} applyPatches={vi.fn()} />);

        fireEvent.click(screen.getByRole('button', { name: /Fecha por contrato/ }));
        expect(screen.getByText('Ninguna capa pendiente')).toBeTruthy();
        expect(screen.getByRole('button', { name: /Marcar 0 celdas/ }).disabled).toBe(true);
    });
});
