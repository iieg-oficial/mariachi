import { useCallback, useMemo, useState } from 'react';

export const resourceKey = (item) => {
    if (!item) return '';
    const scope = item.isDir ? 'dir' : 'file';
    const id = item.isDir ? item.path : item.name;
    return `${scope}:${item.workspace || ''}:${id}`;
};

export const toResourceRef = (item) => ({
    name: item.isDir ? item.path : item.name,
    workspace: item.workspace || '',
    isDir: Boolean(item.isDir),
});

export default function useGeoserverSelection() {
    const [editMode, setEditMode] = useState(false);
    const [selected, setSelected] = useState([]);

    const keys = useMemo(() => selected.map(resourceKey), [selected]);

    const clear = useCallback(() => setSelected([]), []);

    const toggle = useCallback((item) => {
        const key = resourceKey(item);
        setSelected((prev) => (prev.some((it) => resourceKey(it) === key)
            ? prev.filter((it) => resourceKey(it) !== key)
            : [...prev, item]));
    }, []);

    const isSelected = useCallback(
        (item) => keys.includes(resourceKey(item)),
        [keys],
    );

    const replace = useCallback((items) => setSelected(items), []);

    const toggleEditMode = useCallback(() => {
        setEditMode((prev) => {
            if (prev) setSelected([]);
            return !prev;
        });
    }, []);

    return {
        editMode,
        toggleEditMode,
        selected,
        selectedKeys: keys,
        count: selected.length,
        toggle,
        isSelected,
        replace,
        clear,
    };
}
