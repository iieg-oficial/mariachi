export const TIPOS_INCIDENCIA = [
    { value: 'vacaciones', label: 'Vacaciones', color: 'blue' },
    { value: 'economico', label: 'Día económico', color: 'cyan' },
    { value: 'permiso', label: 'Permiso', color: 'gold' },
    { value: 'incapacidad', label: 'Incapacidad', color: 'volcano' },
    { value: 'cumpleanos', label: 'Cumpleaños', color: 'magenta' },
    { value: 'falta', label: 'Falta justificada', color: 'default' },
    { value: 'comision', label: 'Comisión', color: 'green' },
    { value: 'capacitacion', label: 'Capacitación', color: 'green' },
];

export const COLOR_INCIDENCIA = Object.fromEntries(
    TIPOS_INCIDENCIA.map((t) => [t.value, t.color]),
);
