import api from '@shared/services/api';

const BASE = '/mapalab';


export const listCategories = async () => {
    const res = await api.get(`${BASE}/symbol-categories`);
    return res.data;
};

export const createCategory = async (payload) => {
    const res = await api.post(`${BASE}/symbol-categories`, payload);
    return res.data;
};

export const updateCategory = async (id, payload) => {
    const res = await api.put(`${BASE}/symbol-categories/${id}`, payload);
    return res.data;
};

export const deleteCategory = async (id) => {
    await api.delete(`${BASE}/symbol-categories/${id}`);
};

export const listSymbols = async (categoryId) => {
    const params = categoryId != null ? { category_id: categoryId } : {};
    const res = await api.get(`${BASE}/symbols`, { params });
    return res.data;
};

export const createSymbol = async (payload) => {
    const res = await api.post(`${BASE}/symbols`, payload);
    return res.data;
};

export const uploadFileSymbol = async ({ file, categoryId, name, sortOrder = 0, kind = 'image' }) => {
    const form = new FormData();
    form.append('file', file);
    form.append('category_id', String(categoryId));
    form.append('kind', kind);
    if (name) form.append('name', name);
    form.append('sort_order', String(sortOrder));
    const res = await api.post(`${BASE}/symbols/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
};

export const uploadImageSymbol = (args) => uploadFileSymbol({ ...args, kind: 'image' });
export const uploadSvgSymbol = (args) => uploadFileSymbol({ ...args, kind: 'svg' });

export const updateSymbol = async (id, payload) => {
    const res = await api.put(`${BASE}/symbols/${id}`, payload);
    return res.data;
};

export const deleteSymbol = async (id) => {
    await api.delete(`${BASE}/symbols/${id}`);
};

export const reorderSymbols = async (items) => {
    await api.post(`${BASE}/symbols/reorder`, { items });
};
