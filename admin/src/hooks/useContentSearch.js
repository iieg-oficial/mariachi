import { useState, useEffect } from 'react';
import { searchContent, getAuthors } from '@services/searchService';

export default function useContentSearch() {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [authorFilter, setAuthorFilter] = useState('all');
    const [dateRange, setDateRange] = useState(null);
    const [searchResults, setSearchResults] = useState([]);
    const [authors, setAuthors] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadAuthors();
    }, []);

    useEffect(() => {
        performSearch();
    }, [searchTerm, statusFilter, authorFilter, dateRange]);

    const loadAuthors = async () => {
        try {
            const data = await getAuthors();
            setAuthors(data);
        } catch (error) {
            console.error('Error loading authors:', error);
        }
    };

    const performSearch = async () => {
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
    };

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
