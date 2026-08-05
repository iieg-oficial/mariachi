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

export const DATE_LIMIT_HOY = 'hoy';

export const DATE_LIMIT_MODES = [
    { value: 'none', label: 'Sin límite' },
    { value: 'today', label: 'Fecha de llenado' },
    { value: 'fixed', label: 'Fecha específica' },
];

export const DATE_LIMIT_MODES_FIJOS = DATE_LIMIT_MODES.filter((m) => m.value !== 'today');

export const FRECUENCIA_OPTIONS = [
    { value: 'mensual', label: 'Mensual' },
    { value: 'trimestral', label: 'Trimestral' },
    { value: 'semestral', label: 'Semestral' },
    { value: 'anual', label: 'Anual' },
];

export const stepTypeLabel = (type) => STEP_TYPES.find((t) => t.value === type)?.label ?? type;

export const fieldTypeLabel = (type) => FIELD_TYPES.find((t) => t.value === type)?.label ?? type;

export const frecuenciaLabel = (value) =>
    FRECUENCIA_OPTIONS.find((f) => f.value === value)?.label ?? value;
