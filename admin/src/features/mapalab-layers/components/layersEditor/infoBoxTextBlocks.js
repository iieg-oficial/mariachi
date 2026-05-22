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
