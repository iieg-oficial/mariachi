const NAME_COLUMNS = ['palette_name', 'paleta', 'nombre', 'name'];
const LIST_COLUMNS = ['colores', 'colors'];
const HEX = /^[0-9a-f]{1,6}$/i;

const detectDelimiter = (line) => ['\t', ';', ','].find((d) => line.includes(d)) || ',';

export const parseCsv = (text) => {
    const source = String(text ?? '').replace(/^\uFEFF/, '');
    const delimiter = detectDelimiter(source.split('\n')[0] || '');
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < source.length; i += 1) {
        const char = source[i];
        if (quoted) {
            if (char === '"' && source[i + 1] === '"') {
                cell += '"';
                i += 1;
            } else if (char === '"') {
                quoted = false;
            } else {
                cell += char;
            }
        } else if (char === '"') {
            quoted = true;
        } else if (char === delimiter) {
            row.push(cell);
            cell = '';
        } else if (char === '\n' || char === '\r') {
            if (char === '\r' && source[i + 1] === '\n') i += 1;
            row.push(cell);
            rows.push(row);
            row = [];
            cell = '';
        } else {
            cell += char;
        }
    }
    if (cell || row.length) rows.push([...row, cell]);
    return rows.filter((r) => r.some((c) => c.trim()));
};

export const normalizeHex = (value) => {
    const clean = String(value ?? '').trim().replace(/^#/, '').replace(/\.0+$/, '');
    return HEX.test(clean) ? `#${clean.padStart(6, '0').toUpperCase()}` : null;
};

const splitColors = (text) => String(text ?? '').split(/[\s,;]+/).map(normalizeHex);

export const parsePaletteTable = (text) => {
    const [header = [], ...body] = parseCsv(text);
    const columns = header.map((c) => c.trim().toLowerCase());
    const nameAt = columns.findIndex((c) => NAME_COLUMNS.includes(c));
    const hexAt = columns.indexOf('hex');
    const listAt = columns.findIndex((c) => LIST_COLUMNS.includes(c));
    const stepAt = columns.indexOf('step');
    if (nameAt < 0 || (hexAt < 0 && listAt < 0)) return [];
    const palettes = new Map();
    body.forEach((cells, index) => {
        const name = (cells[nameAt] || '').trim();
        if (!name) return;
        const entries = palettes.get(name) || [];
        if (hexAt >= 0) {
            entries.push({ step: Number(cells[stepAt]) || index, hex: normalizeHex(cells[hexAt]) });
        } else {
            splitColors(cells[listAt]).forEach((hex, step) => entries.push({ step, hex }));
        }
        palettes.set(name, entries);
    });
    return [...palettes.entries()]
        .map(([name, entries]) => ({
            name,
            colors: [...entries].sort((a, b) => a.step - b.step).map((e) => e.hex),
        }))
        .filter((palette) => palette.colors.length && palette.colors.every(Boolean));
};
