import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchGridRows, patchGridCells } from '@shared/services/gridService';
import { message } from '@shared/services/message';

const DRAFT_PREFIX = 'mariachi.grid';
const UNDO_LIMIT = 100;

const normalize = (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value === 'string' && !value.trim()) return null;
    return value;
};

const sameValue = (a, b) => {
    const left = normalize(a);
    const right = normalize(b);
    if (left === null && right === null) return true;
    if (left === null || right === null) return false;
    if (typeof left === 'boolean' || typeof right === 'boolean') {
        return Boolean(left) === Boolean(right);
    }
    return String(left) === String(right);
};

const draftStorageKey = (resource) => `${DRAFT_PREFIX}.${resource}.draft`;

const readStoredDraft = (resource) => {
    try {
        const raw = window.localStorage.getItem(draftStorageKey(resource));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed.cells !== 'object') return null;
        return parsed;
    } catch {
        return null;
    }
};

const writeStoredDraft = (resource, cells) => {
    try {
        if (!cells || Object.keys(cells).length === 0) {
            window.localStorage.removeItem(draftStorageKey(resource));
            return;
        }
        window.localStorage.setItem(
            draftStorageKey(resource),
            JSON.stringify({ cells, savedAt: new Date().toISOString() }),
        );
    } catch {
        return;
    }
};

export default function useGridEditor({ resource, rowKeyField = 'layer_key', filters }) {
    const [baseRows, setBaseRows] = useState([]);
    const [columnsMeta, setColumnsMeta] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [draft, setDraft] = useState({});
    const [conflicts, setConflicts] = useState([]);
    const [recoveredDraft, setRecoveredDraft] = useState(null);
    const undoStack = useRef([]);
    const [undoDepth, setUndoDepth] = useState(0);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchGridRows(resource, filters);
            setBaseRows(data.rows || []);
            setColumnsMeta(data.columns || []);
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error cargando la tabla');
        } finally {
            setLoading(false);
        }
    }, [resource, filters]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        const stored = readStoredDraft(resource);
        if (stored && Object.keys(stored.cells).length > 0) {
            setRecoveredDraft(stored);
        }
    }, [resource]);

    useEffect(() => {
        writeStoredDraft(resource, draft);
    }, [resource, draft]);

    const data = useMemo(() => baseRows.map((row) => {
        const patch = draft[row[rowKeyField]];
        return patch ? { ...row, ...patch } : row;
    }), [baseRows, draft, rowKeyField]);

    const dirtyCount = useMemo(
        () => Object.values(draft).reduce((total, cells) => total + Object.keys(cells).length, 0),
        [draft],
    );

    const baseByKey = useMemo(() => {
        const map = new Map();
        baseRows.forEach((row) => map.set(row[rowKeyField], row));
        return map;
    }, [baseRows, rowKeyField]);

    const editableKeys = useMemo(
        () => columnsMeta.filter((col) => col.editable !== false).map((col) => col.key),
        [columnsMeta],
    );

    const applyPatches = useCallback((patches, { trackUndo = true } = {}) => {
        if (!patches.length) return;
        const inverse = [];
        setDraft((prev) => {
            const next = { ...prev };
            patches.forEach(({ rowKey, column, value }) => {
                const baseRow = baseByKey.get(rowKey);
                const currentCells = next[rowKey] || {};
                inverse.push({
                    rowKey,
                    column,
                    value: Object.prototype.hasOwnProperty.call(currentCells, column)
                        ? currentCells[column]
                        : undefined,
                });
                const isBackToBase = baseRow && sameValue(baseRow[column], value);
                const cells = { ...currentCells };
                if (isBackToBase || value === undefined) {
                    delete cells[column];
                } else {
                    cells[column] = value;
                }
                if (Object.keys(cells).length === 0) {
                    delete next[rowKey];
                } else {
                    next[rowKey] = cells;
                }
            });
            return next;
        });
        if (trackUndo) {
            undoStack.current = [...undoStack.current, inverse].slice(-UNDO_LIMIT);
            setUndoDepth(undoStack.current.length);
        }
    }, [baseByKey]);

    const handleGridChange = useCallback((nextRows, visibleRows) => {
        const reference = visibleRows || data;
        const patches = [];
        nextRows.forEach((nextRow, index) => {
            const currentRow = reference[index];
            if (!currentRow) return;
            const rowKey = currentRow[rowKeyField];
            editableKeys.forEach((column) => {
                if (!sameValue(currentRow[column], nextRow[column])) {
                    patches.push({ rowKey, column, value: normalize(nextRow[column]) });
                }
            });
        });
        applyPatches(patches);
    }, [data, rowKeyField, editableKeys, applyPatches]);

    const undo = useCallback(() => {
        const last = undoStack.current[undoStack.current.length - 1];
        if (!last) return;
        undoStack.current = undoStack.current.slice(0, -1);
        setUndoDepth(undoStack.current.length);
        setDraft((prev) => {
            const next = { ...prev };
            last.forEach(({ rowKey, column, value }) => {
                const cells = { ...(next[rowKey] || {}) };
                if (value === undefined) {
                    delete cells[column];
                } else {
                    cells[column] = value;
                }
                if (Object.keys(cells).length === 0) {
                    delete next[rowKey];
                } else {
                    next[rowKey] = cells;
                }
            });
            return next;
        });
    }, []);

    const discardDraft = useCallback(() => {
        setDraft({});
        setConflicts([]);
        undoStack.current = [];
        setUndoDepth(0);
    }, []);

    const restoreRecoveredDraft = useCallback(() => {
        if (!recoveredDraft) return;
        setDraft(recoveredDraft.cells);
        setRecoveredDraft(null);
    }, [recoveredDraft]);

    const dismissRecoveredDraft = useCallback(() => {
        setRecoveredDraft(null);
        writeStoredDraft(resource, {});
    }, [resource]);

    const save = useCallback(async () => {
        const changes = [];
        Object.entries(draft).forEach(([rowKey, cells]) => {
            const baseRow = baseByKey.get(rowKey);
            Object.entries(cells).forEach(([column, value]) => {
                changes.push({
                    rowKey,
                    column,
                    fromValue: baseRow ? normalize(baseRow[column]) : null,
                    toValue: normalize(value),
                });
            });
        });
        if (!changes.length) return null;

        setSaving(true);
        try {
            const result = await patchGridCells(resource, changes);
            const conflictSet = new Set(
                (result.conflicts || []).map((item) => `${item.rowKey}::${item.column}`),
            );
            const rejectedList = result.rejected || [];
            const rejectedSet = new Set(
                rejectedList.map((item) => `${item.rowKey}::${item.column}`),
            );

            setDraft((prev) => {
                const next = {};
                Object.entries(prev).forEach(([rowKey, cells]) => {
                    const kept = {};
                    Object.entries(cells).forEach(([column, value]) => {
                        const id = `${rowKey}::${column}`;
                        if (conflictSet.has(id)) kept[column] = value;
                    });
                    if (Object.keys(kept).length > 0) next[rowKey] = kept;
                });
                return next;
            });
            setConflicts(result.conflicts || []);
            undoStack.current = [];
            setUndoDepth(0);

            await load();

            if (result.applied > 0) {
                message.success(
                    `${result.applied} ${result.applied === 1 ? 'cambio guardado' : 'cambios guardados'}`,
                );
            }
            if (rejectedList.length > 0) {
                message.warning(`${rejectedSet.size} celda(s) no se pudieron guardar`);
            }
            if ((result.conflicts || []).length > 0) {
                message.warning(
                    `${result.conflicts.length} celda(s) cambiaron desde que las abriste`,
                );
            }
            return result;
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al guardar');
            return null;
        } finally {
            setSaving(false);
        }
    }, [draft, baseByKey, resource, load]);

    return {
        data,
        columnsMeta,
        loading,
        saving,
        draft,
        dirtyCount,
        conflicts,
        canUndo: undoDepth > 0,
        undo,
        handleGridChange,
        save,
        reload: load,
        discardDraft,
        recoveredDraft,
        restoreRecoveredDraft,
        dismissRecoveredDraft,
    };
}
