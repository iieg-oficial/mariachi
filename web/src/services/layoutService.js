import api from './apiService';

export const getLayouts = async () => {
    try {
        const response = await api.get('/layouts');
        return response.data;
    } catch (error) {
        console.error('Error fetching layouts:', error);
        return {};
    }
};

export const getLayoutByType = async (layoutType) => {
    try {
        const response = await api.get(`/layouts/${layoutType}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching layout ${layoutType}:`, error);
        return {};
    }
};
