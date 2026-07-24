import { DEFAULT_OPEN_RANGE_CATALOG } from '../../constants/definitionTypes';

const equalsToList = (equals) => (Array.isArray(equals) ? equals : [equals])
    .filter((v) => v !== undefined && v !== null && v !== '')
    .map(String);

const normalizeEquals = (raw) => {
    const list = equalsToList(raw);
    return list.length > 1 ? list : (list[0] ?? '');
};

export const fieldFromFormValues = (values) => {
    const source = values.option_source ?? (values.catalog ? 'catalog' : 'options');
    const options = source === 'catalog' ? [] : (values.options_list ?? [])
        .map((o) => ({
            value: String(o?.value ?? '').trim(),
            label: String(o?.label ?? '').trim(),
        }))
        .filter((o) => o.value)
        .map((o) => ({ value: o.value, label: o.label || o.value }));
    const catalog = source === 'catalog' ? values.catalog : null;
    const showWhen = values.showWhen_field
        ? { field: values.showWhen_field, equals: normalizeEquals(values.showWhen_equals) }
        : undefined;
    const validation = {};
    if (values.minLength != null) validation.minLength = values.minLength;
    if (values.maxLength != null) validation.maxLength = values.maxLength;
    if (values.pattern) validation.pattern = values.pattern;
    if (values.pattern && values.patternMessage) validation.patternMessage = values.patternMessage;
    if (values.min != null) validation.min = values.min;
    if (values.max != null) validation.max = values.max;

    const accept = Array.isArray(values.accept)
        ? values.accept.map((x) => x.trim()).filter(Boolean)
        : [];

    const colSpan = values.colSpan ?? 1;

    return {
        name: values.name,
        label: values.label,
        type: values.type,
        ...(values.required ? { required: true } : {}),
        ...(values.editableAfterSubmit ? { editableAfterSubmit: true } : {}),
        ...(values.placeholder ? { placeholder: values.placeholder } : {}),
        ...(values.tooltip ? { tooltip: values.tooltip } : {}),
        ...(values.tab ? { tab: values.tab } : {}),
        ...(options.length > 0 ? { options } : {}),
        ...(catalog ? { catalog } : {}),
        ...(showWhen ? { showWhen } : {}),
        ...(Object.keys(validation).length > 0 ? { validation } : {}),
        ...(values.type === 'file' && values.bucket ? { bucket: values.bucket } : {}),
        ...(values.type === 'file' && accept.length > 0 ? { accept } : {}),
        ...(values.type === 'file' && values.maxSizeMB != null ? { maxSizeMB: values.maxSizeMB } : {}),
        ...(values.type === 'date_range' && values.openStart ? { openStart: true } : {}),
        ...(values.type === 'date_range' && values.openEnd ? { openEnd: true } : {}),
        ...(values.type === 'date_range'
            && (values.openStart || values.openEnd)
            && values.openCatalog
            ? { openCatalog: values.openCatalog }
            : {}),
        layout: { colSpan, ...(values.newRow ? { newRow: true } : {}) },
    };
};

export const fieldToFormValues = (field) => ({
    name: field?.name ?? '',
    label: field?.label ?? '',
    type: field?.type ?? undefined,
    required: !!field?.required,
    editableAfterSubmit: !!field?.editableAfterSubmit,
    placeholder: field?.placeholder ?? '',
    tooltip: field?.tooltip ?? '',
    tab: field?.tab ?? undefined,
    options_list: (field?.options ?? []).map((o) => ({
        value: String(o.value),
        label: o.label ?? String(o.value),
    })),
    catalog: field?.catalog ?? '',
    option_source: field?.catalog ? 'catalog' : 'options',
    showWhen_field: field?.showWhen?.field ?? '',
    showWhen_equals: equalsToList(field?.showWhen?.equals),
    minLength: field?.validation?.minLength,
    maxLength: field?.validation?.maxLength,
    pattern: field?.validation?.pattern ?? '',
    patternMessage: field?.validation?.patternMessage ?? '',
    min: field?.validation?.min,
    max: field?.validation?.max,
    bucket: field?.bucket ?? undefined,
    accept: field?.accept ?? [],
    maxSizeMB: field?.maxSizeMB,
    openStart: !!field?.openStart,
    openEnd: !!field?.openEnd,
    openCatalog: field?.openCatalog ?? DEFAULT_OPEN_RANGE_CATALOG,
    colSpan: field?.layout?.colSpan ?? 1,
    newRow: !!field?.layout?.newRow,
});

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
    if (!showWhen?.field) return null;
    const values = equalsToList(showWhen.equals);
    if (values.length === 0) return null;
    const source = sources.find((f) => f.name === showWhen.field) ?? null;
    const options = conditionValueOptions(source, catalogos);
    const valueLabels = values.map(
        (v) => options?.find((o) => o.value === v)?.label ?? v,
    );
    return {
        triggerName: showWhen.field,
        triggerLabel: source?.label || showWhen.field,
        valueLabels,
        valueText: valueLabels.map((l) => `«${l}»`).join(' o '),
        isMulti: source?.type === 'select_multiple',
    };
};

export const dependentsOf = (fields = [], name) => (
    name ? fields.filter((f) => f.showWhen?.field === name) : []
);

export const tabOf = (field, tabs = []) => {
    if (tabs.length === 0) return null;
    return tabs.some((t) => t.id === field?.tab) ? field.tab : tabs[0].id;
};

export const needsTabNormalization = (fields = [], tabs = []) => (
    tabs.length > 0 && fields.some((f) => !tabs.some((t) => t.id === f.tab))
);

export const normalizeTabs = (fields = [], tabs = []) => {
    if (!needsTabNormalization(fields, tabs)) return fields;
    return fields.map((f) => (
        tabs.some((t) => t.id === f.tab) ? f : { ...f, tab: tabs[0].id }
    ));
};

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
    return tabId ? { ...rest, tab: tabId } : rest;
});

export const renameTabInFields = (fields, oldId, newId) => (
    oldId === newId
        ? fields
        : fields.map((f) => (f.tab === oldId ? { ...f, tab: newId } : f))
);

export const moveFieldsToTab = (fields, fromTabId, toTabId) => fields.map((f) => {
    if (f.tab !== fromTabId) return f;
    const { tab: _tab, ...rest } = f;
    return toTabId ? { ...rest, tab: toTabId } : rest;
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
