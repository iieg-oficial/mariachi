const KEY = 'mariachi.estilosLote.v1';

export const loadBatch = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
        return saved && Array.isArray(saved.rows) ? saved : null;
    } catch {
        return null;
    }
};

export const saveBatch = (batch) => {
    try {
        if (batch) localStorage.setItem(KEY, JSON.stringify(batch));
        else localStorage.removeItem(KEY);
    } catch {
        return;
    }
};
