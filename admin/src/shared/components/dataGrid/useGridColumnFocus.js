import { useCallback, useMemo } from 'react';

export default function useGridColumnFocus({ gridRef, columnsMeta, rows, activeRowKey, rowKeyField }) {
    const columns = useMemo(
        () => columnsMeta.filter((meta) => !meta.sticky).map((meta) => ({ key: meta.key, title: meta.title })),
        [columnsMeta],
    );

    const focusColumn = useCallback((key) => {
        const col = columns.findIndex((column) => column.key === key);
        if (col < 0 || !rows.length) return;
        const actual = rows.findIndex((row) => row[rowKeyField] === activeRowKey);
        setTimeout(() => gridRef.current?.setActiveCell({ col, row: actual >= 0 ? actual : 0 }), 0);
    }, [columns, rows, activeRowKey, rowKeyField, gridRef]);

    return { columns, focusColumn };
}
