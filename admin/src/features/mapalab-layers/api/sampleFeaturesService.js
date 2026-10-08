import api from '@shared/services/api';

export const fetchSampleFeatures = async (alias, layer, limit = 10) => {
    const res = await api.get(
        `/geoserver/workspaces/${encodeURIComponent(alias)}/layers/${encodeURIComponent(layer)}/sample-features`,
        { params: { limit } },
    );
    return res.data?.features || [];
};
