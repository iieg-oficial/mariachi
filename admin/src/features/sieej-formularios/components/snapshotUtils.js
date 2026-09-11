import { fieldTypeLabel } from '../constants/definitionTypes';

const optionLabel = (field, value) => {
    const opt = (field.options || []).find((o) => o.value === value);
    return opt ? opt.label : value;
};

export const formatFieldValue = (field, value) => {
    if (value === null || value === undefined || value === '') return '—';
    switch (field.type) {
    case 'checkbox':
        return value ? 'Sí' : 'No';
    case 'select':
    case 'radio':
        return optionLabel(field, value);
    case 'select_multiple':
        return Array.isArray(value) && value.length
            ? value.map((v) => optionLabel(field, v)).join(', ')
            : '—';
    case 'date_range': {
        const inicio = value?.startOption || value?.start || '';
        const fin = value?.endOption || value?.end || '';
        return inicio || fin ? `${inicio} – ${fin}` : '—';
    }
    case 'file':
        return value?.filename_original || value?.url_publica || '—';
    default:
        return String(value);
    }
};

const visibleFields = (step) => (step.fields || []).filter((f) => f.type !== 'info');

export const buildRespuestas = (definicion, datos) => {
    const steps = definicion?.steps || [];
    const valores = datos || {};
    return steps
        .filter((step) => step.type !== 'summary')
        .map((step) => {
            const fields = visibleFields(step);
            if (step.type === 'repeater') {
                const items = Array.isArray(valores[step.id]) ? valores[step.id] : [];
                return {
                    id: step.id,
                    title: step.title,
                    repeater: true,
                    items: items.map((item, idx) => ({
                        key: `${step.id}-${idx}`,
                        nombre: item?.__etiqueta || null,
                        entries: fields.map((f) => ({
                            key: f.name,
                            label: f.label || f.name,
                            value: formatFieldValue(f, item?.[f.name]),
                        })),
                    })),
                };
            }
            const scope = valores[step.id] || {};
            return {
                id: step.id,
                title: step.title,
                repeater: false,
                entries: fields.map((f) => ({
                    key: f.name,
                    label: f.label || f.name,
                    value: formatFieldValue(f, scope[f.name]),
                })),
            };
        });
};

const indexFields = (definicion) => {
    const map = new Map();
    for (const step of definicion?.steps || []) {
        for (const field of step.fields || []) {
            if (field.type === 'info') continue;
            map.set(`${step.id}.${field.name}`, {
                path: `${step.id}.${field.name}`,
                stepTitle: step.title,
                label: field.label || field.name,
                field,
            });
        }
    }
    return map;
};

const optionValues = (field) => (field.options || []).map((o) => o.value).join('|');

const fieldChanges = (before, after) => {
    const cambios = [];
    if ((before.label || before.field.name) !== (after.label || after.field.name)) {
        cambios.push(`etiqueta: "${before.label}" → "${after.label}"`);
    }
    if (before.field.type !== after.field.type) {
        cambios.push(`tipo: ${fieldTypeLabel(before.field.type)} → ${fieldTypeLabel(after.field.type)}`);
    }
    if (!!before.field.required !== !!after.field.required) {
        cambios.push(after.field.required ? 'ahora es obligatorio' : 'ya no es obligatorio');
    }
    if (optionValues(before.field) !== optionValues(after.field)) {
        cambios.push('cambiaron las opciones');
    }
    return cambios;
};

export const diffDefiniciones = (snapshot, actual) => {
    const antes = indexFields(snapshot);
    const ahora = indexFields(actual);
    const agregados = [];
    const eliminados = [];
    const modificados = [];

    for (const [path, info] of ahora) {
        if (!antes.has(path)) agregados.push(info);
    }
    for (const [path, info] of antes) {
        if (!ahora.has(path)) {
            eliminados.push(info);
        } else {
            const cambios = fieldChanges(info, ahora.get(path));
            if (cambios.length) modificados.push({ ...info, cambios });
        }
    }
    return { agregados, eliminados, modificados };
};
