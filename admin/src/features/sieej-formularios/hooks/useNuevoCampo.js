import { useCallback, useMemo, useState } from 'react';
import {
    GRID_COLUMNS, layoutOf, moveToSlot, snapColSpan,
} from '../components/visualEditor/fieldLayout';

export default function useNuevoCampo({ visibleIdx, hasTabs, activeKey }) {
    const [enHueco, setEnHueco] = useState(null);

    const valoresIniciales = useMemo(() => ({
        ...(hasTabs ? { tab: activeKey } : {}),
        layout: enHueco
            ? layoutOf(enHueco.colSpan, enHueco.gap.col, false, false)
            : layoutOf(1, 1, false, true),
    }), [hasTabs, activeKey, enHueco]);

    const colocar = (fields, nuevoIdx, nombre) => {
        if (!enHueco) return { fields, idx: nuevoIdx };
        const next = moveToSlot(fields, [...visibleIdx, nuevoIdx], nuevoIdx, enHueco.gap);
        const colocado = next.findIndex((f) => f.name === nombre);
        return { fields: next, idx: colocado >= 0 ? colocado : nuevoIdx };
    };

    const limpiar = useCallback(() => setEnHueco(null), []);

    return {
        valoresIniciales,
        colocar,
        limpiar,
        filaDestino: enHueco?.gap?.row ?? null,
        prepararHueco: (hueco) => setEnHueco({
            gap: hueco,
            colSpan: snapColSpan(hueco.units / GRID_COLUMNS),
        }),
    };
}
