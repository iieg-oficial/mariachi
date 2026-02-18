import api from './apiService';

export const getPages = async () => {
    try {
        const response = await api.get('/paginas');
        return response.data;
    } catch (error) {
        console.error('Error fetching pages:', error);
        return [];
    }
};

export const getPageById = async (pageId) => {
    try {
        const response = await api.get(`/paginas/${pageId}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching page ${pageId}:`, error);
        return null;
    }
};

export const getPreviewPage = async (token) => {
    try {
        const response = await api.get(`/preview/${token}`)
        return response.data
    } catch (error) {
        if (error.response?.status !== 404) {
            console.error('Error fetching preview:', error)
        }
        return null
    }
}

export const getPageBySlug = async (slug) => {
    try {
        const response = await api.get(`/paginas/${slug}`);
        return response.data;
    } catch (error) {
        if (error.response?.status !== 404) {
            console.error(`Error fetching page by slug ${slug}:`, error);
        }
        return null;
    }
};
