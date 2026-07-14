export const conditionValueOptions = (source, catalogos = {}) => {
    if (!source) return null;
    if (source.type === 'checkbox') {
        return [
            { value: 'true', label: 'Sí (marcado)' },
            { value: 'false', label: 'No (sin marcar)' },
        ];
    }
    const inline = source.options ?? [];
    if (inline.length > 0) {
        return inline.map((o) => ({ value: String(o.value), label: o.label ?? String(o.value) }));
    }
    if (source.catalog) {
        const items = catalogos[source.catalog];
        if (!Array.isArray(items)) return null;
        return items.map((it) => {
            const value = it.value ?? it.id;
            return { value: String(value), label: it.label ?? it.value ?? String(value) };
        });
    }
    return null;
};

export const describeCondition = (showWhen, sources = [], catalogos = {}) => {
    if (!showWhen?.field || showWhen.equals === undefined || showWhen.equals === '') return null;
    const source = sources.find((f) => f.name === showWhen.field) ?? null;
    const options = conditionValueOptions(source, catalogos);
    return {
        triggerName: showWhen.field,
        triggerLabel: source?.label || showWhen.field,
        valueLabel: options?.find((o) => o.value === String(showWhen.equals))?.label
            ?? String(showWhen.equals),
        isMulti: source?.type === 'select_multiple',
    };
};

export const dependentsOf = (fields = [], name) => (
    name ? fields.filter((f) => f.showWhen?.field === name) : []
);

export const COMMON_TAB = '__common__';

export const tabOf = (field, tabs = []) => (
    field?.tab && tabs.some((t) => t.id === field.tab) ? field.tab : COMMON_TAB
);

export const isOrphanTab = (field, tabs = []) => (
    !!field?.tab && !tabs.some((t) => t.id === field.tab)
);

export const indicesOfTab = (fields = [], tabs = [], tabKey) => fields
    .map((f, i) => (tabOf(f, tabs) === tabKey ? i : -1))
    .filter((i) => i >= 0);

export const reorderWithinTab = (fields, indices, from, to) => {
    const group = indices.map((i) => fields[i]);
    const [moved] = group.splice(from, 1);
    group.splice(to, 0, moved);

    const out = [...fields];
    indices.forEach((globalIdx, k) => { out[globalIdx] = group[k]; });
    return out;
};

export const assignColSpan = (fields, index, colSpan) => fields.map((f, i) => (
    i === index ? { ...f, layout: { ...f.layout, colSpan } } : f
));

export const assignTab = (fields, index, tabId) => fields.map((f, i) => {
    if (i !== index) return f;
    const { tab: _tab, ...rest } = f;
    return tabId === COMMON_TAB ? rest : { ...rest, tab: tabId };
});

export const renameTabInFields = (fields, oldId, newId) => (
    oldId === newId
        ? fields
        : fields.map((f) => (f.tab === oldId ? { ...f, tab: newId } : f))
);

export const detachFieldsFromTab = (fields, tabId) => fields.map((f) => {
    if (f.tab !== tabId) return f;
    const { tab: _tab, ...rest } = f;
    return rest;
});

export const dropFieldsOfTab = (fields, tabId) => fields.filter((f) => f.tab !== tabId);

const followsTrigger = (fields, index, triggerIdx, triggerName) => {
    if (index <= triggerIdx) return false;
    for (let i = triggerIdx + 1; i < index; i++) {
        if (fields[i]?.showWhen?.field !== triggerName) return false;
    }
    return true;
};

export const placeAfterTrigger = (fields, index) => {
    const field = fields[index];
    const triggerName = field?.showWhen?.field;
    if (!triggerName) return fields;

    const triggerIdx = fields.findIndex((f) => f.name === triggerName);
    if (triggerIdx < 0 || triggerIdx === index) return fields;
    if (followsTrigger(fields, index, triggerIdx, triggerName)) return fields;

    const rest = fields.filter((_, i) => i !== index);
    const restTriggerIdx = rest.findIndex((f) => f.name === triggerName);
    let insertIdx = restTriggerIdx + 1;
    while (rest[insertIdx]?.showWhen?.field === triggerName) insertIdx++;

    return [...rest.slice(0, insertIdx), field, ...rest.slice(insertIdx)];
};
