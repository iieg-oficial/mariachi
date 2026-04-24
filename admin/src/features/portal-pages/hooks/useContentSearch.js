import { useState, useEffect, useCallback } from 'react';
import { searchContent, getAuthors } from '@features/portal-pages/hooks/searchService';

export default function useContentSearch() {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [authorFilter, setAuthorFilter] = useState('all');
    const [dateRange, setDateRange] = useState(null);
    const [searchResults, setSearchResults] = useState([]);
    const [authors, setAuthors] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadAuthors = useCallback(async () => {
        try {
            const data = await getAuthors();
            setAuthors(data);
        } catch (error) {
            console.error('Error loading authors:', error);
        }
    }, []);

    const performSearch = useCallback(async () => {
        setLoading(true);
        try {
            const results = await searchContent({
                searchTerm,
                status: statusFilter,
                author: authorFilter,
                dateRange
            });
            setSearchResults(results);
        } catch (error) {
            console.error('Error searching content:', error);
            setSearchResults([]);
        } finally {
            setLoading(false);
        }
    }, [searchTerm, statusFilter, authorFilter, dateRange]);

    useEffect(() => {
        loadAuthors();
    }, [loadAuthors]);

    useEffect(() => {
        performSearch();
    }, [performSearch]);

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setAuthorFilter('all');
        setDateRange(null);
    };

    const activeFiltersCount = [
        searchTerm,
        statusFilter !== 'all',
        authorFilter !== 'all',
        dateRange
    ].filter(Boolean).length;

    return {
        searchTerm,
        setSearchTerm,
        statusFilter,
        setStatusFilter,
        authorFilter,
        setAuthorFilter,
        dateRange,
        setDateRange,
        searchResults,
        loading,
        clearFilters,
        authors,
        activeFiltersCount
    };
}
