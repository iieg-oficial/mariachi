import api from '@shared/services/api';

const BASE = '/layer-metadata/bulk';

export const fetchColumnPresets = async () => {
    const res = await api.get(`${BASE}/column-presets`);
    return res.data;
};

export const uploadAndPlan = async ({ file, dependencia, columnMapping, onProgress }) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('dependencia', dependencia);
    formData.append('column_mapping', JSON.stringify(columnMapping));
    const res = await api.post(`${BASE}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
        onUploadProgress: (e) => {
            if (onProgress && e.total) {
                onProgress(Math.round((e.loaded * 100) / e.total));
            }
        }
    });
    return res.data;
};

export const applyPlan = async (planId, layerKeys) => {
    const payload = layerKeys ? { layerKeys } : {};
    const res = await api.post(`${BASE}/plan/${planId}/apply`, payload);
    return res.data;
};

export const cancelPlan = async (planId) => {
    await api.delete(`${BASE}/plan/${planId}`);
};
