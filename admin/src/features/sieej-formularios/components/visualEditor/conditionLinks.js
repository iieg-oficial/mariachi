import { tabOf } from './fieldUtils';

const TRIGGER_COLORS = ['purple', 'magenta', 'geekblue', 'volcano', 'cyan', 'gold'];

export const colorOfTrigger = (name) => {
    if (!name) return 'default';
    let hash = 0;
    for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 9973;
    return TRIGGER_COLORS[hash % TRIGGER_COLORS.length];
};

export const triggerNameOf = (field) => field?.showWhen?.field ?? null;

export const dependentNamesOf = (fields = [], name) => (
    name ? fields.filter((f) => triggerNameOf(f) === name).map((f) => f.name) : []
);

export const chainFrom = (fields, name, vistos = new Set()) => {
    if (!name || vistos.has(name)) return vistos;
    vistos.add(name);
    const field = fields.find((f) => f.name === name);
    return chainFrom(fields, triggerNameOf(field), vistos);
};

export const conditionIssueOf = (fields = [], tabs = [], index) => {
    const field = fields[index];
    const triggerName = triggerNameOf(field);
    if (!triggerName) return null;

    const trigger = fields.find((f) => f.name === triggerName);
    if (!trigger) return 'sin-disparador';

    const cadena = chainFrom(fields, triggerName);
    if (cadena.has(field.name)) return 'circular';

    if (tabs.length > 0 && tabOf(trigger, tabs) !== tabOf(field, tabs)) return 'otra-pestana';

    return null;
};

export const ISSUE_TEXT = {
    'sin-disparador': {
        tag: 'Sin disparador',
        detail: (name) => `«${name}» ya no existe en este paso, así que la condición se pierde al guardar. Elige otro campo o quita la condición.`,
    },
    circular: {
        tag: 'Condición circular',
        detail: () => 'La cadena de condiciones vuelve a este campo, así que nunca podría mostrarse.',
    },
    'otra-pestana': {
        tag: 'Disparador en otra pestaña',
        detail: (name) => `«${name}» vive en otra pestaña del elemento, donde se captura por separado: la condición no se evalúa como esperas.`,
    },
};

export const relationOf = (fields, tabs, index) => {
    const field = fields[index];
    const triggerName = triggerNameOf(field);
    const dependents = dependentNamesOf(fields, field?.name);
    return {
        triggerName,
        dependents,
        issue: conditionIssueOf(fields, tabs, index),
        color: colorOfTrigger(triggerName ?? field?.name),
    };
};

export const highlightRoleOf = (fields, activo, index) => {
    if (!activo) return null;
    const field = fields[index];
    if (!field?.name) return 'ajeno';
    if (field.name === activo) return 'disparador';
    if (triggerNameOf(field) === activo) return 'dependiente';
    return 'ajeno';
};
