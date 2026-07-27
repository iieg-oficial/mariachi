export const COLSPAN_CHOICES = [
    { value: 1, label: 'Fila completa', short: 'Completa' },
    { value: 2, label: 'Media fila', short: 'Mitad' },
    { value: 3, label: 'Un tercio', short: 'Tercio' },
];

const COLSPAN_HINT = {
    1: 'Ocupa la línea completa: ningún otro campo se acomoda a su lado.',
    2: 'Ocupa media línea: cabe otro campo de media línea a su lado.',
    3: 'Ocupa un tercio de la línea: caben otros dos campos a su lado.',
};

const POSITION_LABELS = {
    1: ['Línea completa'],
    2: ['Izquierda', 'Derecha'],
    3: ['Izquierda', 'Centro', 'Derecha'],
};

export const colSpanHint = (colSpan) => COLSPAN_HINT[colSpan] ?? COLSPAN_HINT[1];

export const colSpanLabel = (colSpan) => (
    COLSPAN_CHOICES.find((c) => c.value === colSpan)?.short ?? COLSPAN_CHOICES[0].short
);

export const positionLabels = (count) => POSITION_LABELS[count] ?? POSITION_LABELS[1];

export const positionLabel = (colSpan, cols, col) => {
    const labels = positionLabels(cols.length);
    const i = cols.indexOf(col);
    return i >= 0 ? labels[i] : labels[0];
};
