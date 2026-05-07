export const TIPO_LABELS = {
    problema: 'Problema',
    solicitud: 'Solicitud',
    sugerencia: 'Sugerencia',
    duda: 'Duda',
    datos_incorrectos: 'Datos incorrectos',
    bug: 'Bug',
};

export const TIPO_COLORS = {
    problema: 'red',
    solicitud: 'blue',
    sugerencia: 'green',
    duda: 'gold',
    datos_incorrectos: 'orange',
    bug: 'purple',
};

export const ESTADO_LABELS = {
    nuevo: 'Nuevo',
    en_revision: 'En revisión',
    resuelto: 'Resuelto',
    descartado: 'Descartado',
};

export const ESTADO_COLORS = {
    nuevo: 'red',
    en_revision: 'blue',
    resuelto: 'green',
    descartado: 'default',
};

export const SOURCE_APPS = [
    { value: 'mapalab', label: 'MapaLab' },
    { value: 'sieej', label: 'SIEEJ' },
    { value: 'portal', label: 'Portal' },
];

export function formatDate(value) {
    if (!value) return '—';
    try {
        return new Date(value).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
        return value;
    }
}
