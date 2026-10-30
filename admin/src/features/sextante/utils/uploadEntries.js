export const toSafeName = (raw) =>
    (raw || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9._-]/g, '');

export const toSafePath = (raw) =>
    (raw || '').split('/').map(toSafeName).filter(Boolean).join('/');

export const describeFile = (file, relativePath, extensions) => {
    const safe = toSafePath(relativePath || file.name);
    const base = safe.split('/').pop() || '';
    const pattern = new RegExp(`^[a-z0-9._-]+\\.(${extensions.join('|')})$`, 'i');
    if (!pattern.test(base)) return { safe, valid: false, reason: 'Omitido: extensión no soportada' };
    if (!file.size) return { safe, valid: false, reason: 'Omitido: archivo vacío' };
    return { safe, valid: true, reason: null };
};

export const joinPath = (...parts) => parts.filter(Boolean).join('/');

const readBatch = (reader) => new Promise((resolve, reject) => reader.readEntries(resolve, reject));
const entryFile = (entry) => new Promise((resolve, reject) => entry.file(resolve, reject));

const walk = async (entry, prefix, out) => {
    const path = joinPath(prefix, entry.name);
    if (entry.isFile) {
        out.push({ file: await entryFile(entry), relativePath: path });
        return;
    }
    if (!entry.isDirectory) return;
    const reader = entry.createReader();
    for (;;) {
        const batch = await readBatch(reader);
        if (!batch.length) return;
        for (const child of batch) await walk(child, path, out);
    }
};

export const filesFromDataTransfer = async (dataTransfer) => {
    const entries = [...(dataTransfer?.items || [])]
        .filter((item) => item.kind === 'file')
        .map((item) => item.webkitGetAsEntry?.())
        .filter(Boolean);
    if (!entries.length) {
        return [...(dataTransfer?.files || [])].map((file) => ({ file, relativePath: file.name }));
    }
    const out = [];
    for (const entry of entries) await walk(entry, '', out);
    return out;
};
