import api from '@shared/services/api';

const BASE = '/geoserver/files';


export const browseGeoserverFiles = async (path = '') => {
    const res = await api.get(BASE, { params: path ? { path } : {} });
    return res.data;
};

export const uploadGeoserverFile = async ({ file, name }) => {
    const form = new FormData();
    form.append('file', file);
    if (name) form.append('name', name);
    const res = await api.post(BASE, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
};

export const deleteGeoserverFile = async (name) => {
    const parts = name.split('/').map(encodeURIComponent).join('/');
    await api.delete(`${BASE}/${parts}`);
};
