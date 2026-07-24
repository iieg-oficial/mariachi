export const STEP_TYPES = [
    { value: 'form', label: 'Formulario' },
    { value: 'repeater', label: 'Lista repetible' },
    { value: 'summary', label: 'Resumen' },
];

export const FIELD_TYPES = [
    { value: 'text', label: 'Texto' },
    { value: 'textarea', label: 'Texto largo' },
    { value: 'number', label: 'Número' },
    { value: 'date', label: 'Fecha' },
    { value: 'date_range', label: 'Rango de fechas' },
    { value: 'select', label: 'Selección' },
    { value: 'select_multiple', label: 'Selección múltiple' },
    { value: 'radio', label: 'Opción única (radio)' },
    { value: 'checkbox', label: 'Casilla' },
    { value: 'file', label: 'Archivo' },
    { value: 'info', label: 'Texto informativo' },
];

export const DEFAULT_OPEN_RANGE_CATALOG = 'estatus_fecha';

export const stepTypeLabel = (type) => STEP_TYPES.find((t) => t.value === type)?.label ?? type;

export const fieldTypeLabel = (type) => FIELD_TYPES.find((t) => t.value === type)?.label ?? type;
