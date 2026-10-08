const MOTIVOS = {
    invalid_format: 'Llave con formato inválido',
    invalid_key: 'Llave inexistente',
    revoked: 'Llave cancelada',
    suspended: 'Llave suspendida',
    inactive: 'Llave inactiva',
    expired: 'Llave vencida',
    origin_blocked: 'Sitio no autorizado',
    ip_blocked: 'IP no autorizada',
    daily_or_monthly_quota: 'Cuota diaria o mensual agotada',
};

export function etiquetaMotivo(motivo) {
    if (!motivo) return null;
    if (motivo.startsWith('layer_blocked:')) return `Capa no permitida: ${motivo.slice('layer_blocked:'.length)}`;
    return MOTIVOS[motivo] || motivo;
}
