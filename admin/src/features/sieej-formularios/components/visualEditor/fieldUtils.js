export const parseOptions = (text) => (text || '')
    .split('\n').map((l) => l.trim()).filter(Boolean)
    .map((line) => {
        const [v, ...rest] = line.split('|');
        return { value: v.trim(), label: (rest.join('|') || v).trim() };
    });
