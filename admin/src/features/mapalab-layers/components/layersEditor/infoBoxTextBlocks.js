export const TEXT_KEY_PREFIX = 'text:';

export const isTextKey = (k) => typeof k === 'string' && k.startsWith(TEXT_KEY_PREFIX);
export const textIdOf = (k) => k.slice(TEXT_KEY_PREFIX.length);
export const mkTextKey = (id) => `${TEXT_KEY_PREFIX}${id}`;

let textIdSeq = 0;
export const genTextId = () => `t${Date.now().toString(36)}${(textIdSeq++).toString(36)}`;

export const normalizeTextBlocks = (cfg) => {
    if (!cfg || typeof cfg !== 'object' || !Array.isArray(cfg.text) || cfg.text.length === 0) {
        return cfg;
    }
    const isLegacy = !Array.isArray(cfg.text[0]?.items);
    if (!isLegacy) return cfg;
    const next = { ...cfg, text: [{ id: 't0', items: cfg.text }] };
    if (Array.isArray(cfg.blockOrder)) {
        next.blockOrder = cfg.blockOrder.map((k) => (k === 'text' ? mkTextKey('t0') : k));
    }
    return next;
};

const LEGACY_LABELS_STYLE = { color: '#7B61FF', bg: '#F3F0FF' };

export const normalizeLegacyLabels = (cfg) => {
    if (!cfg || typeof cfg !== 'object' || !Array.isArray(cfg.labels) || cfg.labels.length === 0) {
        return cfg;
    }
    const migrated = { fields: cfg.labels.slice(), ...LEGACY_LABELS_STYLE };
    const labelGroups = Array.isArray(cfg.labelGroups) ? [migrated, ...cfg.labelGroups] : [migrated];
    const { labels: _drop, ...rest } = cfg;
    const next = { ...rest, labelGroups };
    if (Array.isArray(cfg.blockOrder)) {
        const filtered = cfg.blockOrder.filter((k) => k !== 'labels');
        next.blockOrder = filtered.length ? filtered : undefined;
        if (!next.blockOrder) delete next.blockOrder;
    }
    return next;
};

export const normalizeInfoboxConfig = (cfg) => normalizeLegacyLabels(normalizeTextBlocks(cfg));
