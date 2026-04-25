import { useState, useEffect } from 'react';
import { searchContent, getAuthors } from '@features/portal-pages/hooks/searchService';

export default function useContentSearch() {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [authorFilter, setAuthorFilter] = useState('all');
    const [dateRange, setDateRange] = useState(null);
    const [searchResults, setSearchResults] = useState([]);
    const [authors, setAuthors] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        getAuthors()
            .then((data) => { if (!cancelled) setAuthors(data); })
            .catch((err) => console.error('Error loading authors:', err));
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        let cancelled = false;
        searchContent({ searchTerm, status: statusFilter, author: authorFilter, dateRange })
            .then((results) => { if (!cancelled) setSearchResults(results); })
            .catch((err) => {
                console.error('Error searching content:', err);
                if (!cancelled) setSearchResults([]);
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [searchTerm, statusFilter, authorFilter, dateRange]);

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
