const FORMATO = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' });

export const formatearFecha = (iso) => (iso ? FORMATO.format(new Date(iso)) : '—');
