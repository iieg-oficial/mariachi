import { SEMANTIC } from '@app/providers/brand';

export const UMBRAL = { cpu: 90, ram: 80, swap: 10, disco: 85 };

export const ESTADO_BADGE = {
    ok: { status: 'success', texto: 'operativo' },
    degraded: { status: 'warning', texto: 'degradado' },
    down: { status: 'error', texto: 'caído' },
};

export const ESCALA_TEMPERATURA = [
    { hasta: 45, color: SEMANTIC.info, texto: 'fría' },
    { hasta: 70, color: SEMANTIC.success, texto: 'templada' },
    { hasta: 85, color: SEMANTIC.warning, texto: 'caliente' },
];

export const TEMPERATURA_TOPE = 100;

export const tono = (llave, valor) => {
    if (valor == null) return SEMANTIC.neutral;
    if (valor >= UMBRAL[llave]) return SEMANTIC.danger;
    if (valor >= UMBRAL[llave] * 0.75) return SEMANTIC.warning;
    return SEMANTIC.success;
};

export const gradoDe = (grados) => ESCALA_TEMPERATURA.find((t) => grados < t.hasta)
    || { color: SEMANTIC.danger, texto: 'muy caliente' };

export const desdeHace = (segundos) => {
    if (segundos == null) return '—';
    const dias = Math.floor(segundos / 86400);
    return dias >= 1 ? `${dias} d` : `${Math.floor(segundos / 3600)} h`;
};

export const discoLibre = (host) => {
    if (host.disk_free_gb == null) return '—';
    if (host.disk_used_percent == null) return `${host.disk_free_gb} GB libres`;
    const total = host.disk_free_gb / (1 - host.disk_used_percent / 100);
    return `${Math.round(total - host.disk_free_gb)} / ${Math.round(total)} GB`;
};
