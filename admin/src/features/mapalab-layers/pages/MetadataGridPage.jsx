import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Spin } from 'antd';
import {
    DataGrid,
    GridHistoryDrawer,
    GridShortcutsModal,
    useGridEditor,
    useGridPresence,
} from '@shared/components/dataGrid';
import { METADATA_GRID_CATALOGS } from '@features/mapalab-layers/constants/metadataCatalogs';
import MetadataGridToolbar, { ALL_WORKSPACES } from '@features/mapalab-layers/components/metadataGrid/MetadataGridToolbar';
import MetadataGridStatusBar from '@features/mapalab-layers/components/metadataGrid/MetadataGridStatusBar';
import MetadataGridNotices from '@features/mapalab-layers/components/metadataGrid/MetadataGridNotices';
import useElementHeight from '@shared/hooks/useElementHeight';
import useIsMobile from '@shared/hooks/useIsMobile';
import { exportGrid } from '@shared/services/gridService';
import { triggerDownload } from '@shared/helpers/downloadFile';
import { message } from '@shared/services/message';
import { useFullscreenHeader } from '@app/fullscreenHeader';

const RESOURCE = 'layer-metadata';
const ROW_KEY = 'layer_key';
const EMPTY_FILTERS = {};
const TREE_PATH = '/mapalab/layers';

const isNumeraliaColumn = (key) => key.startsWith('numeralia_');

export default function MetadataGridPage() {
    const { isDesktop } = useIsMobile();
    const [workspace, setWorkspace] = useState(null);
    const [search, setSearch] = useState('');
    const [activeRowKey, setActiveRowKey] = useState(null);
    const [activeColumnId, setActiveColumnId] = useState(null);
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
    } = useGridEditor({ resource: RESOURCE, rowKeyField: ROW_KEY, filters: EMPTY_FILTERS });

    const { presenceByRow } = useGridPresence({
        resource: RESOURCE,
        activeRowKey,
        enabled: !loading,
    });

    const workspaceItems = useMemo(() => {
        const unique = Array.from(new Set(data.map((row) => row.workspace).filter(Boolean))).sort();
        return [
            { key: ALL_WORKSPACES, label: 'Todos los workspaces' },
            { type: 'divider' },
            ...unique.map((value) => ({ key: value, label: value })),
        ];
    }, [data]);

    const handleExport = useCallback(async (option) => {
        const [formato, hoja] = option === 'xlsx' ? ['xlsx', null] : option.split('-');
        setExporting(true);
        try {
            const response = await exportGrid(RESOURCE, {
                formato,
                hoja,
                workspace,
                search: search.trim() || undefined,
            });
            triggerDownload(response, `metadatos-capas.${formato}`);
        } catch {
            message.error('No se pudo generar la descarga');
        } finally {
            setExporting(false);
        }
    }, [workspace, search]);

    const headerExtra = useMemo(() => (
        <MetadataGridToolbar
            isDesktop={isDesktop}
            dirtyCount={dirtyCount}
            saving={saving}
            onSave={save}
            onUndo={undo}
            canUndo={canUndo}
            search={search}
            onSearchChange={setSearch}
            workspace={workspace}
            onWorkspaceChange={setWorkspace}
            workspaceItems={workspaceItems}
            onReload={reload}
            onOpenShortcuts={() => setShortcutsOpen(true)}
            onOpenHistory={() => setHistoryOpen(true)}
            onExport={handleExport}
            exporting={exporting}
        />
    ), [
        isDesktop, dirtyCount, saving, save, undo, canUndo, search, workspace,
        workspaceItems, reload, handleExport, exporting,
    ]);

    useFullscreenHeader({
        title: isDesktop ? 'Capas MapaLab · captura masiva' : 'Captura masiva',
        backTo: TREE_PATH,
        extra: headerExtra,
    });

    const visibleData = useMemo(() => {
        const term = search.trim().toLowerCase();
        return data.filter((row) => {
            if (workspace && row.workspace !== workspace) return false;
            if (!term) return true;
            return [row.layer_key, row.layer_name_usuario, row.descripcion]
                .some((value) => String(value || '').toLowerCase().includes(term));
        });
    }, [data, workspace, search]);

    const isCellDisabled = useCallback((rowData, meta) => {
        if (!rowData) return false;
        return Boolean(rowData.has_dynamic_stats) && isNumeraliaColumn(meta.key);
    }, []);

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
        () => (activeRowKey ? data.find((row) => row[ROW_KEY] === activeRowKey) : null),
        [activeRowKey, data],
    );

    const othersEditing = useMemo(() => {
        const names = new Set();
        Object.values(presenceByRow || {}).forEach((editors) => {
            (editors || []).forEach((editor) => names.add(editor.name || editor.username));
        });
        return Array.from(names);
    }, [presenceByRow]);

    const pendingDescriptions = useMemo(
        () => data.filter((row) => !row.descripcion || !String(row.descripcion).trim()).length,
        [data],
    );

    const dynamicStatsCount = useMemo(
        () => data.filter((row) => row.has_dynamic_stats).length,
        [data],
    );

    useEffect(() => {
        const onKeyDown = (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
                event.preventDefault();
                undo();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [undo]);

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
            <MetadataGridNotices
                recoveredDraft={recoveredDraft}
                onRestoreDraft={restoreRecoveredDraft}
                onDismissDraft={dismissRecoveredDraft}
                conflicts={conflicts}
                dynamicStatsCount={dynamicStatsCount}
            />

            <div ref={gridWrapperRef} style={{ flex: 1, minHeight: 0 }}>
                {loading ? (
                    <Spin style={{ display: 'block', margin: '48px auto' }} />
                ) : (
                    <DataGrid
                        columnsMeta={columnsMeta}
                        catalogs={METADATA_GRID_CATALOGS}
                        data={visibleData}
                        draft={draft}
                        rowKeyField={ROW_KEY}
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

            <MetadataGridStatusBar
                dirtyCount={dirtyCount}
                onDiscard={discardDraft}
                activeRow={activeRow}
                activeColumnTitle={activeColumnTitle}
                othersEditing={othersEditing}
                pendingDescriptions={pendingDescriptions}
                visibleCount={visibleData.length}
                totalCount={data.length}
            />

            <GridShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

            <GridHistoryDrawer
                open={historyOpen}
                onClose={() => setHistoryOpen(false)}
                resource={RESOURCE}
                columnsMeta={columnsMeta}
                rowKey={activeRowKey}
                rowLabel={activeRow?.layer_name_usuario || activeRowKey}
            />
        </div>
    );
}
