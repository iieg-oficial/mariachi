export const GRID_COLUMNS = 6;

export const COLSPAN_UNITS = { 1: 6, 2: 3, 3: 2 };

export const unitsOfColSpan = (colSpan) => COLSPAN_UNITS[colSpan] ?? GRID_COLUMNS;

export const MIN_FIELD_UNITS = Math.min(...Object.values(COLSPAN_UNITS));

export const cabeUnCampo = (units) => units >= MIN_FIELD_UNITS;

export const unitsOfField = (field) => unitsOfColSpan(field?.layout?.colSpan ?? 1);

export const startColOf = (field) => {
    const col = field?.layout?.col;
    if (Number.isInteger(col) && col >= 1 && col <= GRID_COLUMNS) return col;
    return field?.layout?.newRow ? 1 : null;
};

export const isAlone = (field) => !!field?.layout?.alone;

export const layoutOf = (colSpan, col, alone = false) => ({
    colSpan,
    col,
    ...(col === 1 ? { newRow: true } : {}),
    ...(alone ? { alone: true } : {}),
});

export const colChoicesFor = (colSpan) => {
    const units = unitsOfColSpan(colSpan);
    const cols = [];
    for (let c = 1; c + units <= GRID_COLUMNS + 1; c += units) cols.push(c);
    return cols;
};

export const nearestCol = (colSpan, col) => {
    const choices = colChoicesFor(colSpan);
    if (choices.includes(col)) return col;
    return choices.reduce(
        (best, c) => (Math.abs(c - col) < Math.abs(best - col) ? c : best),
        choices[0],
    );
};

export const snapColSpan = (ratio) => {
    if (ratio >= 0.75) return 1;
    if (ratio >= 0.42) return 2;
    return 3;
};

export const groupIntoRows = (fields, indices = []) => {
    const rows = [];
    let items = [];
    let cursor = 1;

    const flush = () => {
        if (items.length === 0) return;
        const used = items.reduce((acc, it) => acc + it.units, 0);
        rows.push({
            items,
            indices: items.map((it) => it.idx),
            used,
            free: GRID_COLUMNS - used,
        });
        items = [];
        cursor = 1;
    };

    indices.forEach((idx) => {
        const units = unitsOfField(fields[idx]);
        const wanted = startColOf(fields[idx]);
        const alone = isAlone(fields[idx]);
        let col;
        if (alone) {
            flush();
            col = Math.min(wanted ?? 1, GRID_COLUMNS + 1 - units);
        } else if (wanted == null) {
            if (items.length > 0 && cursor + units > GRID_COLUMNS + 1) flush();
            col = cursor;
        } else {
            if (items.length > 0 && wanted < cursor) flush();
            col = Math.min(wanted, GRID_COLUMNS + 1 - units);
        }
        items.push({ idx, col, units, alone });
        cursor = col + units;
        if (alone || cursor > GRID_COLUMNS) flush();
    });
    flush();

    return rows;
};

export const rowOfField = (fields, indices, idx) => (
    groupIntoRows(fields, indices).find((r) => r.indices.includes(idx)) ?? null
);

export const placedColOf = (fields, indices, idx) => (
    rowOfField(fields, indices, idx)?.items.find((it) => it.idx === idx)?.col ?? 1
);

export const rowMatesOf = (fields, indices, targetIdx) => {
    const row = rowOfField(fields, indices, targetIdx);
    if (!row) return [];
    return row.indices.filter((i) => i !== targetIdx).map((i) => fields[i]);
};

export const slotsOfRow = (row, fields, targetIdx, labelOf) => {
    if (!row) return [];
    const slots = [];
    let cursor = 1;
    row.items.forEach((it) => {
        if (it.col > cursor) slots.push({ kind: 'gap', units: it.col - cursor });
        slots.push({
            kind: it.idx === targetIdx ? 'self' : 'field',
            name: fields[it.idx]?.name,
            label: labelOf(fields[it.idx]),
            units: it.units,
        });
        cursor = it.col + it.units;
    });
    if (cursor <= GRID_COLUMNS) slots.push({ kind: 'gap', units: GRID_COLUMNS + 1 - cursor });
    return slots;
};

export const assignCol = (fields, index, col) => fields.map((f, i) => (
    i === index
        ? { ...f, layout: layoutOf(f.layout?.colSpan ?? 1, col, isAlone(f)) }
        : f
));

export const materializeLayout = (fields, indices) => {
    const colPorIdx = new Map();
    groupIntoRows(fields, indices).forEach((row) => {
        row.items.forEach((it) => colPorIdx.set(it.idx, it.col));
    });
    return fields.map((f, i) => (
        colPorIdx.has(i)
            ? { ...f, layout: layoutOf(f.layout?.colSpan ?? 1, colPorIdx.get(i), isAlone(f)) }
            : f
    ));
};

export const reflowCol = (fields, indices, index) => {
    if (startColOf(fields[index]) == null) return fields;
    const sinPosicion = fields.map((f, i) => (
        i === index ? { ...f, layout: { colSpan: f.layout?.colSpan, alone: f.layout?.alone } } : f
    ));
    return assignCol(fields, index, placedColOf(sinPosicion, indices, index));
};

export const assignColSpan = (fields, index, colSpan) => fields.map((f, i) => {
    if (i !== index) return f;
    const col = f.layout?.col;
    return Number.isInteger(col)
        ? { ...f, layout: layoutOf(colSpan, nearestCol(colSpan, col), isAlone(f)) }
        : { ...f, layout: { ...f.layout, colSpan } };
});

export const layoutSlots = (fields, indices) => {
    const slots = [];

    groupIntoRows(fields, indices).forEach((row, rowIdx) => {
        let cursor = 1;
        let previo = null;
        row.items.forEach((it) => {
            if (it.col > cursor) {
                slots.push({
                    kind: 'gap', row: rowIdx, col: cursor, units: it.col - cursor, after: previo,
                });
            }
            slots.push({ kind: 'field', row: rowIdx, idx: it.idx, col: it.col, units: it.units });
            cursor = it.col + it.units;
            previo = it.idx;
        });
        if (cursor <= GRID_COLUMNS) {
            slots.push({
                kind: 'gap',
                row: rowIdx,
                col: cursor,
                units: GRID_COLUMNS + 1 - cursor,
                after: previo,
            });
        }
    });

    return slots;
};

export const moveToSlot = (fields, indices, index, gap) => {
    const orden = indices.filter((i) => i !== index);
    const posicion = gap.after == null ? 0 : orden.indexOf(gap.after) + 1;
    orden.splice(posicion, 0, index);

    const reordenado = [...fields];
    const campos = orden.map((i) => fields[i]);
    indices.forEach((globalIdx, k) => { reordenado[globalIdx] = campos[k]; });

    const destino = indices[orden.indexOf(index)];
    const units = unitsOfField(fields[index]);
    return assignCol(reordenado, destino, Math.min(gap.col, GRID_COLUMNS + 1 - units));
};
