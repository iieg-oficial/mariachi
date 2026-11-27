import api from '@shared/services/api';

const enc = encodeURIComponent;

const sin404 = (peticion) => peticion
    .then((res) => res.data)
    .catch((err) => {
        if (err?.response?.status === 404) return null;
        throw err;
    });

const normalizarStats = (data) => data && {
    stats_config: data.statsConfig ?? data.stats_config ?? [],
    pie_numeralia: data.pieNumeralia ?? data.pie_numeralia ?? '',
    ttl_minutes: data.ttlMinutes ?? data.ttl_minutes ?? null,
    values: Array.isArray(data.values) ? data.values : [],
};

export const fetchPublicado = async (borrador) => {
    const { resource_type: tipo, resource_id: id } = borrador;
    if (tipo === 'layer') return sin404(api.get(`/layers/${enc(id)}`));
    if (tipo === 'layer_metadata') return sin404(api.get(`/layer-metadata/${enc(id)}`));
    if (tipo === 'layer_stats') return normalizarStats(await sin404(api.get(`/layer-metadata/${enc(id)}/stats`)));
    return null;
};
