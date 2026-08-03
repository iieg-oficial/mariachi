import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Spin } from 'antd';
import DataGrid from '@shared/components/dataGrid/DataGrid';
import GridHistoryDrawer from '@shared/components/dataGrid/GridHistoryDrawer';
import GridNotices from '@shared/components/dataGrid/GridNotices';
import GridShortcutsModal from '@shared/components/dataGrid/GridShortcutsModal';
import GridStatusBar from '@shared/components/dataGrid/GridStatusBar';
import GridToolbar, { ALL_FILTER_VALUES } from '@shared/components/dataGrid/GridToolbar';
import useGridEditor from '@shared/components/dataGrid/useGridEditor';
import useGridPresence from '@shared/components/dataGrid/useGridPresence';
import useElementHeight from '@shared/hooks/useElementHeight';
import useIsMobile from '@shared/hooks/useIsMobile';
import { exportGrid } from '@shared/services/gridService';
import { triggerDownload } from '@shared/helpers/downloadFile';
import { message } from '@shared/services/message';

const EMPTY_FILTERS = {};

export default function GridPanel({
    resource,
    rowKeyField,
    catalogs,
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
    active = true,
    onToolbarChange,
    onStatusChange,
    onDirtyCountChange,
}) {
    const { isDesktop } = useIsMobile();
    const [filterValue, setFilterValue] = useState(null);
    const [search, setSearch] = useState('');
    const [activeRowKey, setActiveRowKey] = useState(null);
    const [activeColumnId, setActiveColumnId] = useState(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [exporting, setExporting] = useState(false);
    const gridWrapperRef = useRef(null);
    const gridHeight = useElementHeight(gridWrapperRef);

    const {
        data,
        columnsMeta,
        loading,
        saving,
        draft,
        dirtyCount,
        conflicts,
        canUndo,
        undo,
        handleGridChange,
        save,
        reload,
        discardDraft,
        recoveredDraft,
        restoreRecoveredDraft,
        dismissRecoveredDraft,
    } = useGridEditor({ resource, rowKeyField, filters: EMPTY_FILTERS });

    const { presenceByRow } = useGridPresence({
        resource,
        activeRowKey,
        enabled: active && !loading,
    });

    const filterItems = useMemo(() => {
        if (!filterField) return [];
        const unique = Array.from(new Set(data.map((row) => row[filterField]).filter(Boolean))).sort();
        return [
            { key: ALL_FILTER_VALUES, label: filterAllLabel },
            { type: 'divider' },
            ...unique.map((value) => ({ key: value, label: value })),
        ];
    }, [data, filterField, filterAllLabel]);

    const handleExport = useCallback(async (option) => {
        const [formato, hoja] = option === 'xlsx' ? ['xlsx', null] : option.split('-');
        setExporting(true);
        try {
            const response = await exportGrid(resource, {
                formato,
                hoja,
                workspace: filterValue,
                search: search.trim() || undefined,
            });
            triggerDownload(response, `${exportFileName}.${formato}`);
        } catch {
            message.error('No se pudo generar la descarga');
        } finally {
            setExporting(false);
        }
    }, [resource, filterValue, search, exportFileName]);

    useEffect(() => {
        if (!active || !onToolbarChange) return;
        onToolbarChange(
            <GridToolbar
                isDesktop={isDesktop}
                dirtyCount={dirtyCount}
                saving={saving}
                onSave={save}
                onUndo={undo}
                canUndo={canUndo}
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder={searchPlaceholder}
                searchOpen={searchOpen}
                onSearchOpenChange={setSearchOpen}
                filterValue={filterValue}
                onFilterChange={setFilterValue}
                filterItems={filterItems}
                filterLabel={filterLabel}
                filterOpen={filterOpen}
                onFilterOpenChange={setFilterOpen}
                onReload={reload}
                onOpenShortcuts={() => setShortcutsOpen(true)}
                onOpenHistory={() => setHistoryOpen(true)}
                onExport={handleExport}
                exporting={exporting}
            />,
        );
    }, [
        active, onToolbarChange, isDesktop, dirtyCount, saving, save, undo, canUndo, search,
        searchPlaceholder, searchOpen, filterValue, filterItems, filterLabel, filterOpen,
        reload, handleExport, exporting,
    ]);

    useEffect(() => {
        if (onDirtyCountChange) onDirtyCountChange(dirtyCount);
    }, [dirtyCount, onDirtyCountChange]);

    const visibleData = useMemo(() => {
        const term = search.trim().toLowerCase();
        return data.filter((row) => {
            if (filterField && filterValue && row[filterField] !== filterValue) return false;
            if (!term) return true;
            return searchFields.some((key) => String(row[key] || '').toLowerCase().includes(term));
        });
    }, [data, filterField, filterValue, search, searchFields]);

    const onGridChange = useCallback(
        (nextRows) => handleGridChange(nextRows, visibleData),
        [handleGridChange, visibleData],
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

    useEffect(() => {
        if (!active) return undefined;
        const onKeyDown = (event) => {
            if (!(event.ctrlKey || event.metaKey)) return;
            const key = event.key.toLowerCase();

            if (key === 'z') {
                event.preventDefault();
                undo();
                return;
            }

            if (key === 'f') {
                event.preventDefault();
                event.stopPropagation();
                if (event.shiftKey) {
                    setSearchOpen(false);
                    setFilterOpen(true);
                } else {
                    setFilterOpen(false);
                    setSearchOpen(true);
                }
            }
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [active, undo]);

    useEffect(() => {
        if (!dirtyCount) return undefined;
        const onBeforeUnload = (event) => {
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [dirtyCount]);

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <GridNotices
                recoveredDraft={recoveredDraft}
                onRestoreDraft={restoreRecoveredDraft}
                onDismissDraft={dismissRecoveredDraft}
                conflicts={conflicts}
                extra={renderNotices ? renderNotices(data) : null}
            />

            <div ref={gridWrapperRef} style={{ flex: 1, minHeight: 0 }}>
                {loading ? (
                    <Spin style={{ display: 'block', margin: '48px auto' }} />
                ) : (
                    <DataGrid
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
                        height={gridHeight}
                    />
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
