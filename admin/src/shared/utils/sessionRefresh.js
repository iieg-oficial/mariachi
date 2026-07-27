const REFRESH_MARK_KEY = 'auth_refreshed_at';
const RECENT_REFRESH_MS = 10000;
const LOCK_NAME = 'auth-session-refresh';

const markRefreshed = () => {
    try {
        localStorage.setItem(REFRESH_MARK_KEY, String(Date.now()));
    } catch {
        /* almacenamiento no disponible */
    }
};

const refreshedRecently = () => {
    try {
        const raw = localStorage.getItem(REFRESH_MARK_KEY);
        if (!raw) return false;
        return Date.now() - Number(raw) < RECENT_REFRESH_MS;
    } catch {
        return false;
    }
};

export const runExclusiveRefresh = async (doRefresh) => {
    const run = async () => {
        if (refreshedRecently()) return true;
        const ok = await doRefresh();
        if (ok) markRefreshed();
        return ok;
    };

    if (typeof navigator !== 'undefined' && navigator.locks?.request) {
        return navigator.locks.request(LOCK_NAME, run);
    }
    return run();
};
