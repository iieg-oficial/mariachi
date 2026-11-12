import { useEffect, useRef, useState } from 'react';
import { message } from '@shared/services/message';
import { batchErrorMessage, reviewTable } from '@features/sextante/api/stylesBatchService';
import { removeRows, rowsToTable, updateRow } from '@features/sextante/utils/stylesBatchTable';

const RECHECK_DELAY = 500;

export default function useBatchRows(initialRows = []) {
    const [rows, setRows] = useState(initialRows);
    const [checkingRows, setCheckingRows] = useState([]);
    const recheck = useRef(null);

    useEffect(() => () => clearTimeout(recheck.current), []);

    const recheckRows = (next, touched, delay) => {
        setRows(next);
        setCheckingRows((prev) => [...new Set([...prev, ...touched])]);
        clearTimeout(recheck.current);
        recheck.current = setTimeout(async () => {
            try {
                setRows(next.length ? await reviewTable(rowsToTable(next)) : []);
            } catch (err) {
                message.error(batchErrorMessage(err, 'No se pudo revisar la tabla'));
            } finally {
                setCheckingRows([]);
            }
        }, delay);
    };

    return {
        rows,
        setRows,
        checkingRows,
        checking: checkingRows.length > 0,
        withErrors: rows.filter((row) => row.errores.length).map((row) => row.fila),
        changeRow: (fila, changes) => recheckRows(updateRow(rows, fila, changes), [fila], RECHECK_DELAY),
        removeRows: (filas) => recheckRows(removeRows(rows, filas), [], 0),
    };
}
