export const STATUS_META = {
    ok: { color: 'success', text: 'Operativo', badge: 'success' },
    degraded: { color: 'warning', text: 'Degradado', badge: 'warning' },
    down: { color: 'error', text: 'Caído', badge: 'error' },
    unreachable: { color: 'error', text: 'No responde', badge: 'error' },
};

export const EVENT_META = {
    down: { color: 'red', text: 'Caída' },
    recovered: { color: 'green', text: 'Recuperado' },
    deployed: { color: 'blue', text: 'Despliegue' },
    reminder: { color: 'orange', text: 'Recordatorio' },
};

export const statusMeta = (status) =>
    STATUS_META[status] ?? { color: 'default', text: status || 'desconocido', badge: 'default' };

export const eventMeta = (kind) =>
    EVENT_META[kind] ?? { color: 'default', text: kind || 'evento' };
