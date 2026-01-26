import { useState } from 'react';
import { Card, Space } from 'antd';

import useContentSearch from '@hooks/useContentSearch';
import SearchBar from '@components/search/SearchBar';
import AdvancedFilters from '@components/search/AdvancedFilters';
import SearchResultsTable from '@components/search/SearchResultsTable';

export default function ContentSearch() {
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    const {
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
    } = useContentSearch();

    const hasActiveFilters =
        searchTerm ||
        statusFilter !== 'all' ||
        authorFilter !== 'all' ||
        dateRange;

    return (
        <div>
            <Card>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <SearchBar
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        showFilters={showAdvancedFilters}
                        onToggleFilters={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        activeFiltersCount={activeFiltersCount}
                    />

                    {showAdvancedFilters && (
                        <AdvancedFilters
                            statusFilter={statusFilter}
                            onStatusChange={setStatusFilter}
                            authorFilter={authorFilter}
                            onAuthorChange={setAuthorFilter}
                            authors={authors}
                            dateRange={dateRange}
                            onDateRangeChange={setDateRange}
                            onClearFilters={clearFilters}
                        />
                    )}

                    <SearchResultsTable
                        results={searchResults}
                        loading={loading}
                        searchTerm={searchTerm}
                        hasActiveFilters={hasActiveFilters}
                        onClearFilters={clearFilters}
                    />
                </Space>
            </Card>
        </div>
    );
}
