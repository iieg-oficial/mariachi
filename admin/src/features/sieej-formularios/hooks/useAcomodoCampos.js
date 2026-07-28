import {
    assignCol, assignColSpan, materializeLayout, moveRow, moveToSlot, swapFields,
    unirLineaAnterior,
} from '../components/visualEditor/fieldLayout';

export default function useAcomodoCampos({ step, fields, visibleIdx, onChange }) {
    const acomodoFijo = () => materializeLayout(fields, visibleIdx);

    const aplicar = (nextFields) => onChange?.({ ...step, fields: nextFields });

    const moverCampo = (from, to) => swapFields(acomodoFijo(), visibleIdx, from, to);

    return {
        acomodoFijo,
        moverCampo,
        aplicarMovimiento: (from, to) => aplicar(moverCampo(from, to)),
        soltarEnHueco: (from, gap) => aplicar(
            moveToSlot(acomodoFijo(), visibleIdx, visibleIdx[from], gap),
        ),
        asignarAncho: (idx, colSpan) => aplicar(assignColSpan(acomodoFijo(), idx, colSpan)),
        asignarColumna: (idx, col) => aplicar(assignCol(acomodoFijo(), idx, col)),
        moverLinea: (rowIdx, direction) => aplicar(
            moveRow(acomodoFijo(), visibleIdx, rowIdx, direction),
        ),
        unirLinea: (idx) => aplicar(unirLineaAnterior(acomodoFijo(), visibleIdx, idx)),
    };
}
