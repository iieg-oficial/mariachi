import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Spin } from 'antd';
import DataGrid from '@shared/components/dataGrid/DataGrid';
import GridFloatingBar from '@shared/components/dataGrid/GridFloatingBar';
import GridHistoryDrawer from '@shared/components/dataGrid/GridHistoryDrawer';
import { GRID_ICON_BUTTON_STYLES } from '@shared/components/dataGrid/gridIconButtonStyles';
import GridNotices from '@shared/components/dataGrid/GridNotices';
import GridShortcutsModal from '@shared/components/dataGrid/GridShortcutsModal';
import GridStatusBar from '@shared/components/dataGrid/GridStatusBar';
import GridToolbar from '@shared/components/dataGrid/GridToolbar';
import GridPillSearch, { GRID_PILL_SEARCH_STYLES } from '@shared/components/dataGrid/GridPillSearch';
import useGridFilter from '@shared/components/dataGrid/useGridFilter';
import useGridColumnFocus from '@shared/components/dataGrid/useGridColumnFocus';
import useGridEditor from '@shared/components/dataGrid/useGridEditor';
import useGridExport from '@shared/components/dataGrid/useGridExport';
import useGridLastChanges from '@shared/components/dataGrid/useGridLastChanges';
import useGridPresence from '@shared/components/dataGrid/useGridPresence';
import useGridShortcuts from '@shared/components/dataGrid/useGridShortcuts';
import useElementHeight from '@shared/hooks/useElementHeight';
import useIsMobile from '@shared/hooks/useIsMobile';

const EMPTY_FILTERS = {};

export default function GridPanel({
    resource,
    rowKeyField,
    catalogs,
    columnTypes,
    filterField,
    filterLabel,
    filterAllLabel,
    searchFields = [],
    searchPlaceholder,
    itemsLabel,
    exportFileName,
    rowLabelField,
    isCellDisabled,
    renderNotices,
    renderStatusExtra,
    renderSelectionActions,
    buildColumnContext,
    search: searchProp,
    onSearchChange,
    filterValue: filterProp,
    onFilterChange,
    renderToolbarExtra,
    active = true,
    onToolbarChange,
    onStatusChange,
    onDirtyCountChange,
}) {
    const { isDesktop } = useIsMobile();
    const [filterLocal, setFilterLocal] = useState(null);
    const [searchLocal, setSearchLocal] = useState('');
    const [selectedKeys, setSelectedKeys] = useState(() => new Set());
    const filterValue = filterProp !== undefined ? filterProp : filterLocal;
    const setFilterValue = onFilterChange || setFilterLocal;
    const search = searchProp !== undefined ? searchProp : searchLocal;
    const setSearch = onSearchChange || setSearchLocal;
    const [activeRowKey, setActiveRowKey] = useState(null);
    const [activeColumnId, setActiveColumnId] = useState(null);
    const [searchFocusTick, setSearchFocusTick] = useState(0);
    const [filterOpen, setFilterOpen] = useState(false);
    const [columnOpen, setColumnOpen] = useState(false);
    const gridRef = useRef(null);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const { exporting, runExport } = useGridExport();
    const gridWrapperRef = useRef(null);
    const gridHeight = useElementHeight(gridWrapperRef);

    const {
        data,
        columnsMeta,
        loading,
        saving,
        draft,
        baseByKey,
        dirtyCount,
        conflicts,
        canUndo,
        undo,
        handleGridChange,
        applyPatches,
        save,
        reload,
        discardDraft,
        recoveredDraft,
        restoreRecoveredDraft,
        dismissRecoveredDraft,
    } = useGridEditor({ resource, rowKeyField, filters: EMPTY_FILTERS });
    const lastChanges = useGridLastChanges(resource, loading);

    const { presenceByRow } = useGridPresence({
        resource,
        activeRowKey,
        enabled: active && !loading,
    });

    const { filterItems, visibleData } = useGridFilter({
        data, filterField, filterAllLabel, filterValue, search, searchFields,
    });

    const handleExport = useCallback((option) => runExport(resource, option, {
        workspace: filterValue,
        search: search.trim() || undefined,
        fileName: exportFileName,
    }), [runExport, resource, filterValue, search, exportFileName]);

    useEffect(() => {
        if (!active || !onToolbarChange) return;
        onToolbarChange(
            <GridToolbar
                isDesktop={isDesktop}
                onOpenShortcuts={() => setShortcutsOpen(true)}
                onOpenHistory={() => setHistoryOpen(true)}
                onExport={handleExport}
                exporting={exporting !== null}
                extra={renderToolbarExtra ? renderToolbarExtra({ data, applyPatches, saving }) : null}
            />,
        );
    }, [
        active, onToolbarChange, isDesktop, handleExport, exporting, renderToolbarExtra, data,
        applyPatches, saving,
    ]);

    useEffect(() => {
        if (onDirtyCountChange) onDirtyCountChange(dirtyCount);
    }, [dirtyCount, onDirtyCountChange]);

    const onGridChange = useCallback(
        (nextRows) => handleGridChange(nextRows, visibleData),
        [handleGridChange, visibleData],
    );

    const columnContext = useMemo(
        () => (buildColumnContext ? buildColumnContext(data) : null),
        [buildColumnContext, data],
    );

    const selection = useMemo(() => {
        if (!renderSelectionActions) return null;
        return {
            keys: selectedKeys,
            toggle: (rowKey) => setSelectedKeys((prev) => {
                const next = new Set(prev);
                if (next.has(rowKey)) next.delete(rowKey);
                else next.add(rowKey);
                return next;
            }),
        };
    }, [renderSelectionActions, selectedKeys]);

    const selectedRows = useMemo(
        () => data.filter((row) => selectedKeys.has(row[rowKeyField])),
        [data, selectedKeys, rowKeyField],
    );

    const handleActiveCell = useCallback(({ columnId }) => setActiveColumnId(columnId), []);

    const activeColumnTitle = useMemo(
        () => (activeColumnId ? columnsMeta.find((meta) => meta.key === activeColumnId)?.title || null : null),
        [activeColumnId, columnsMeta],
    );

    const activeRow = useMemo(
        () => (activeRowKey ? data.find((row) => row[rowKeyField] === activeRowKey) : null),
        [activeRowKey, data, rowKeyField],
    );

    const othersEditing = useMemo(() => {
        const names = new Set();
        Object.values(presenceByRow || {}).forEach((editors) => {
            (editors || []).forEach((editor) => names.add(editor.name || editor.username));
        });
        return Array.from(names);
    }, [presenceByRow]);

    useEffect(() => {
        if (!active || !onStatusChange) return;
        onStatusChange(
            <GridStatusBar
                dirtyCount={dirtyCount}
                onDiscard={discardDraft}
                activeRow={activeRow}
                activeRowLabel={activeRow?.[rowKeyField]}
                activeColumnTitle={activeColumnTitle}
                othersEditing={othersEditing}
                visibleCount={visibleData.length}
                totalCount={data.length}
                itemsLabel={itemsLabel}
                extra={renderStatusExtra ? renderStatusExtra(data) : null}
            />,
        );
    }, [
        active, onStatusChange, dirtyCount, discardDraft, activeRow, rowKeyField,
        activeColumnTitle, othersEditing, visibleData.length, data, itemsLabel, renderStatusExtra,
    ]);

    const { columns: searchColumns, focusColumn } = useGridColumnFocus({
        gridRef, columnsMeta, rows: visibleData, activeRowKey, rowKeyField,
    });

    const focusSearch = useCallback(() => setSearchFocusTick((tick) => tick + 1), []);
    useGridShortcuts({ active, undo, dirtyCount, focusSearch, setFilterOpen, setColumnOpen });

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <style>{GRID_ICON_BUTTON_STYLES + GRID_PILL_SEARCH_STYLES}</style>
            <GridNotices
                recoveredDraft={recoveredDraft}
                onRestoreDraft={restoreRecoveredDraft}
                onDismissDraft={dismissRecoveredDraft}
                conflicts={conflicts}
                extra={renderNotices ? renderNotices(data) : null}
            />

            <div ref={gridWrapperRef} style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                {loading ? (
                    <Spin style={{ display: 'block', margin: '48px auto' }} />
                ) : (
                    <DataGrid
                        gridRef={gridRef}
                        columnsMeta={columnsMeta}
                        catalogs={catalogs}
                        data={visibleData}
                        draft={draft}
                        rowKeyField={rowKeyField}
                        conflicts={conflicts}
                        onChange={onGridChange}
                        onActiveRowChange={setActiveRowKey}
                        onActiveCellChange={handleActiveCell}
                        presenceByRow={presenceByRow}
                        isCellDisabled={isCellDisabled}
                        columnContext={columnContext}
                        selection={selection}
                        baseByKey={baseByKey}
                        lastChanges={lastChanges}
                        columnTypes={columnTypes}
                        height={gridHeight}
                    />
                )}
                {!loading && (
                    <GridFloatingBar
                        dirtyCount={dirtyCount}
                        saving={saving}
                        onSave={save}
                        onUndo={undo}
                        canUndo={canUndo}
                        search={(
                            <GridPillSearch
                                value={search}
                                onChange={setSearch}
                                placeholder={searchPlaceholder}
                                focusSignal={searchFocusTick}
                                filterItems={filterItems}
                                filterValue={filterValue}
                                onFilterChange={setFilterValue}
                                filterLabel={filterLabel || 'Filtro'}
                                filterOpen={filterOpen}
                                onFilterOpenChange={setFilterOpen}
                                columns={searchColumns}
                                onFocusColumn={focusColumn}
                                columnOpen={columnOpen}
                                onColumnOpenChange={setColumnOpen}
                            />
                        )}
                    >
                        {renderSelectionActions ? renderSelectionActions({
                            data,
                            selectedRows,
                            setSelectedKeys,
                            applyPatches,
                            reload,
                        }) : null}
                    </GridFloatingBar>
                )}
            </div>

            <GridShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

            <GridHistoryDrawer
                open={historyOpen}
                onClose={() => setHistoryOpen(false)}
                resource={resource}
                columnsMeta={columnsMeta}
                rowKey={activeRowKey}
                rowLabel={activeRow?.[rowLabelField] || activeRowKey}
            />
        </div>
    );
}
