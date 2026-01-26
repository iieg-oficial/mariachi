import api from './apiService';

export const getPages = async () => {
    try {
        const response = await api.get('/pages');
        return response.data;
    } catch (error) {
        console.error('Error fetching pages:', error);
        return [];
    }
};

export const getPageById = async (pageId) => {
    try {
        const response = await api.get(`/pages/${pageId}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching page ${pageId}:`, error);
        return null;
    }
};
