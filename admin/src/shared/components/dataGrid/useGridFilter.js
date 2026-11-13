import { useMemo } from 'react';
import { ALL_FILTER_VALUES } from '@shared/components/dataGrid/GridPillSearch';

export default function useGridFilter({ data, filterField, filterAllLabel, filterValue, search, searchFields }) {
    const filterItems = useMemo(() => {
        if (!filterField) return [];
        const unique = Array.from(new Set(data.map((row) => row[filterField]).filter(Boolean))).sort();
        return [
            { key: ALL_FILTER_VALUES, label: filterAllLabel },
            { type: 'divider' },
            ...unique.map((value) => ({ key: value, label: value })),
        ];
    }, [data, filterField, filterAllLabel]);

    const visibleData = useMemo(() => {
        const term = search.trim().toLowerCase();
        return data.filter((row) => {
            if (filterField && filterValue && row[filterField] !== filterValue) return false;
            if (!term) return true;
            return searchFields.some((key) => String(row[key] || '').toLowerCase().includes(term));
        });
    }, [data, filterField, filterValue, search, searchFields]);

    return { filterItems, visibleData };
}
