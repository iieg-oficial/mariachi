import { useCallback, useEffect, useState } from 'react';
import {
    createCategory,
    createSymbol,
    deleteCategory,
    deleteSymbol,
    listCategories,
    listSymbols,
    reorderSymbols,
    updateCategory,
    updateSymbol,
    uploadImageSymbol,
} from '@features/mapalab-symbols/api/symbolsService';


export function useSymbolCategories() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setItems(await listCategories());
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Error al cargar categorías');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { reload(); }, [reload]);

    return { items, loading, error, reload };
}


export function useSymbolsByCategory(categoryId) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const reload = useCallback(async () => {
        if (categoryId == null) {
            setItems([]);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            setItems(await listSymbols(categoryId));
        } catch (err) {
            setError(err?.response?.data?.detail || err?.message || 'Error al cargar símbolos');
        } finally {
            setLoading(false);
        }
    }, [categoryId]);

    useEffect(() => { reload(); }, [reload]);

    return { items, loading, error, reload };
}


export {
    createCategory,
    updateCategory,
    deleteCategory,
    createSymbol,
    uploadImageSymbol,
    updateSymbol,
    deleteSymbol,
    reorderSymbols,
};
