import { useEffect, useRef, useState } from 'react';
import { Button, Dropdown, Input, Popover, Select, Tooltip } from 'antd';
import { ColumnWidthOutlined, FilterOutlined, SearchOutlined } from '@ant-design/icons';

export const ALL_FILTER_VALUES = '__todos__';

export const GRID_PILL_SEARCH_STYLES = `
    .grid-pill-search.ant-input-affix-wrapper {
        width: 230px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.12);
        border-color: transparent;
        transition: width 0.2s ease;
    }
    .grid-pill-search.ant-input-affix-wrapper-focused,
    .grid-pill-search.grid-pill-search-filled { width: 340px; }
    .grid-pill-search .ant-input { background: transparent; color: #fff; }
    .grid-pill-search .ant-input::placeholder { color: rgba(255, 255, 255, 0.55); }
    .grid-pill-search .anticon { color: rgba(255, 255, 255, 0.75); }
    .grid-pill-search .grid-pill-search-active .anticon { color: #ffd666; }
`;

export default function GridPillSearch({
    value,
    onChange,
    placeholder,
    focusSignal,
    filterItems,
    filterValue,
    onFilterChange,
    filterLabel,
    filterOpen,
    onFilterOpenChange,
    columns = [],
    onFocusColumn,
    columnOpen,
    onColumnOpenChange,
}) {
    const inputRef = useRef(null);
    const columnRef = useRef(null);
    const [draft, setDraft] = useState(value || '');

    useEffect(() => {
        if (focusSignal) inputRef.current?.focus({ cursor: 'all' });
    }, [focusSignal]);

    useEffect(() => {
        if (!columnOpen) return undefined;
        const timer = setTimeout(() => columnRef.current?.focus(), 0);
        return () => clearTimeout(timer);
    }, [columnOpen]);

    const cambiar = (event) => {
        setDraft(event.target.value);
        onChange?.(event.target.value);
    };

    const filtro = filterItems?.length > 0 && (
        <Dropdown
            placement="topRight"
            trigger={['click']}
            open={filterOpen}
            onOpenChange={onFilterOpenChange}
            menu={{
                items: filterItems,
                selectable: true,
                selectedKeys: [filterValue || ALL_FILTER_VALUES],
                onClick: ({ key }) => {
                    onFilterChange(key === ALL_FILTER_VALUES ? null : key);
                    onFilterOpenChange?.(false);
                },
                style: { maxHeight: 320, overflowY: 'auto' },
            }}
        >
            <Tooltip title={filterValue ? `Filtrado: ${filterValue}` : `Filtrar por ${filterLabel.toLowerCase()} (Ctrl+Shift+F)`}>
                <Button
                    type="text"
                    size="small"
                    shape="circle"
                    icon={<FilterOutlined />}
                    aria-label={`Filtrar por ${filterLabel.toLowerCase()}`}
                    className={filterValue ? 'grid-pill-search-active' : undefined}
                />
            </Tooltip>
        </Dropdown>
    );

    const columna = columns.length > 0 && (
        <Popover
            trigger="click"
            placement="topRight"
            open={columnOpen}
            onOpenChange={onColumnOpenChange}
            arrow={false}
            destroyOnHidden
            content={(
                <Select
                    ref={columnRef}
                    defaultOpen
                    showSearch
                    optionFilterProp="label"
                    placeholder="Ir a la columna…"
                    options={columns.map((c) => ({ value: c.key, label: c.title }))}
                    onChange={(key) => {
                        onColumnOpenChange?.(false);
                        onFocusColumn?.(key);
                    }}
                    style={{ width: 260 }}
                />
            )}
        >
            <Tooltip title="Ir a una columna (Ctrl+G)">
                <Button type="text" size="small" shape="circle" icon={<ColumnWidthOutlined />} aria-label="Ir a una columna" />
            </Tooltip>
        </Popover>
    );

    return (
        <Input
            ref={inputRef}
            className={`grid-pill-search ${draft ? 'grid-pill-search-filled' : ''}`.trim()}
            prefix={<SearchOutlined />}
            suffix={<>{filtro}{columna}</>}
            allowClear
            value={draft}
            onChange={cambiar}
            onKeyDown={(event) => { if (event.key === 'Escape') event.currentTarget.blur(); }}
            placeholder={placeholder || 'Buscar'}
            aria-label="Buscar en la tabla"
        />
    );
}
