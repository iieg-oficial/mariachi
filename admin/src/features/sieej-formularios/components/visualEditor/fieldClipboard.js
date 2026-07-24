const STORAGE_KEY = 'mariachi.sieej.fieldClipboard';
const PAYLOAD_KIND = 'sieej.fields';
const PAYLOAD_VERSION = 1;

export const readFieldClipboard = () => {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const payload = JSON.parse(raw);
        if (payload?.kind !== PAYLOAD_KIND || payload?.v !== PAYLOAD_VERSION) return null;
        if (!Array.isArray(payload.fields) || payload.fields.length === 0) return null;
        return payload;
    } catch {
        return null;
    }
};

export const writeFieldClipboard = (fields, origin = {}) => {
    const payload = {
        kind: PAYLOAD_KIND,
        v: PAYLOAD_VERSION,
        fields: Array.isArray(fields) ? fields : [fields],
        from: {
            formulario: origin.formulario ?? null,
            step: origin.step ?? null,
        },
    };
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
        return null;
    }
    navigator.clipboard?.writeText?.(JSON.stringify(payload, null, 2)).catch(() => {});
    return payload;
};

export const clearFieldClipboard = () => {
    try {
        window.localStorage.removeItem(STORAGE_KEY);
    } catch {
        /* empty */
    }
};

export const uniqueFieldName = (name, takenNames) => {
    if (!takenNames.includes(name)) return name;
    const base = name.replace(/_(\d+)$/, '');
    let suffix = 2;
    while (takenNames.includes(`${base}_${suffix}`)) suffix += 1;
    return `${base}_${suffix}`;
};

export const prepareFieldForPaste = (source, {
    fields = [], tabs = [], targetTab = null, catalogos = {}, buckets = [], fallbackBucket = 'sieej',
} = {}) => {
    const warnings = [];
    const field = { ...source };

    const takenNames = fields.map((f) => f.name).filter(Boolean);
    const name = uniqueFieldName(field.name, takenNames);
    if (name !== field.name) {
        warnings.push(`Ya existía «${field.name}» en este paso; se pegó como «${name}».`);
        field.name = name;
    }

    if (tabs.length > 0) {
        const tabId = tabs.some((t) => t.id === targetTab) ? targetTab : tabs[0].id;
        field.tab = tabId;
    } else {
        delete field.tab;
    }

    if (field.showWhen?.field && !takenNames.includes(field.showWhen.field)) {
        warnings.push(
            `Se quitó la condición: «${field.showWhen.field}» no existe en este paso.`,
        );
        delete field.showWhen;
    }

    if (field.catalog && !Object.prototype.hasOwnProperty.call(catalogos, field.catalog)) {
        warnings.push(`El catálogo «${field.catalog}» no existe; revisa el origen de las opciones.`);
    }

    if (field.type === 'file') {
        const accessible = buckets.map((b) => b.acervo_bucket);
        if (accessible.length > 0 && !accessible.includes(field.bucket)) {
            warnings.push(
                `No tienes acceso al bucket «${field.bucket}»; se usará «${fallbackBucket}».`,
            );
            field.bucket = fallbackBucket;
        }
    }

    return { field, warnings };
};
