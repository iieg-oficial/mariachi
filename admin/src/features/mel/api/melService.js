import api from '@shared/services/api';

const BASE = '/mel';

export const listMarcas = async () => {
    const res = await api.get(`${BASE}/marcas`);
    return res.data;
};

export const getMarca = async (codigo) => {
    const res = await api.get(`${BASE}/${encodeURIComponent(codigo)}`);
    return res.data;
};

export const updateToken = async (codigo, tokenId, payload) => {
    const res = await api.put(
        `${BASE}/${encodeURIComponent(codigo)}/tokens/${tokenId}`,
        payload,
    );
    return res.data;
};

export const updateCampos = async (codigo, valores) => {
    const res = await api.put(`${BASE}/${encodeURIComponent(codigo)}/campos`, { valores });
    return res.data;
};

export const getArtefacto = async (codigo, artefacto) => {
    const res = await api.get(
        `${BASE}/${encodeURIComponent(codigo)}/artefactos/${artefacto}`,
        { responseType: 'text' },
    );
    return res.data;
};

export const downloadExport = async (codigo) => {
    const res = await api.get(`${BASE}/${encodeURIComponent(codigo)}/export`, {
        responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `mel-${codigo}.zip`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
};
