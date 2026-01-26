import api from './apiService';

export const getStyles = async () => {
    try {
        const response = await api.get('/styles');
        return response.data;
    } catch (error) {
        console.error('Error fetching styles:', error);
        return {};
    }
};
