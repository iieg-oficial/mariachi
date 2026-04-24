import api from '@shared/services/api';

export const searchContent = async (params) => {
    const { searchTerm, status, author, dateRange } = params;

    const queryParams = new URLSearchParams();

    if (searchTerm) queryParams.append('q', searchTerm);
    if (status && status !== 'all') queryParams.append('status', status);
    if (author && author !== 'all') queryParams.append('author', author);
    if (dateRange && dateRange.length === 2) {
        queryParams.append('startDate', dateRange[0].toISOString());
        queryParams.append('endDate', dateRange[1].toISOString());
    }

    const response = await api.get(`/api/search/content?${queryParams.toString()}`);
    return response.data;
};

export const searchGlobal = async (query) => {
    const response = await api.get(`/api/search/global?q=${encodeURIComponent(query)}`);
    return response.data;
};

export const getAuthors = async () => {
    const response = await api.get('/api/search/authors');
    return response.data;
};
