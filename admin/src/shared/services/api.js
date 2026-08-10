import axios from 'axios';
import { runExclusiveRefresh } from '@shared/utils/sessionRefresh';

const API_URL = import.meta.env.VITE_ADMIN_API_URL || '/api/mariachi';

const api = axios.create({
    baseURL: API_URL,
    timeout: 10000,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    }
});

api.interceptors.request.use(
    (config) => {
        if (['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase())) {
            const csrfToken = sessionStorage.getItem('csrf_token');
            if (csrfToken) {
                config.headers['X-CSRF-Token'] = csrfToken;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

const humanizeDetail = (detail) => {
    if (!Array.isArray(detail)) return detail;
    return detail
        .map((d) => {
            if (typeof d === 'string') return d;
            const loc = Array.isArray(d?.loc)
                ? d.loc.filter((p) => p !== 'body' && p !== 'query').join('.')
                : '';
            const msg = d?.msg || 'Error de validación';
            return loc ? `${loc}: ${msg}` : msg;
        })
        .join('; ');
};

const isCsrfError = (error) => {
    if (error?.response?.status !== 403) return false;
    const detail = error?.response?.data?.detail;
    if (typeof detail !== 'string') return false;
    return detail.toLowerCase().includes('csrf');
};

let csrfRefreshPromise = null;
let sessionRefreshPromise = null;
let redirectingToLogin = false;

export const refreshCsrfToken = async () => {
    if (csrfRefreshPromise) return csrfRefreshPromise;
    csrfRefreshPromise = (async () => {
        try {
            const { data } = await axios.get(`${API_URL}/autenticacion/csrf`, { withCredentials: true });
            const newToken = data?.csrf_token;
            if (newToken) {
                sessionStorage.setItem('csrf_token', newToken);
                return newToken;
            }
            return null;
        } catch {
            return null;
        } finally {
            csrfRefreshPromise = null;
        }
    })();
    return csrfRefreshPromise;
};

const refreshSession = async () => {
    if (sessionRefreshPromise) return sessionRefreshPromise;
    sessionRefreshPromise = runExclusiveRefresh(async () => {
        try {
            const { data } = await axios.post(`${API_URL}/autenticacion/refrescar`, null, { withCredentials: true });
            const newCsrf = data?.csrf_token;
            if (newCsrf) sessionStorage.setItem('csrf_token', newCsrf);
            return true;
        } catch {
            return false;
        }
    }).finally(() => { sessionRefreshPromise = null; });
    return sessionRefreshPromise;
};

const isAuthEndpoint = (url) =>
    typeof url === 'string' && url.includes('/autenticacion/refrescar');

export const buildMinervaLoginUrl = (next) => {
    const target = typeof next === 'string' && next.startsWith('/') && !next.startsWith('//')
        ? `?next=${encodeURIComponent(next)}`
        : '';
    return `${API_URL}/autenticacion/login${target}`;
};

const redirectToLogin = () => {
    sessionStorage.removeItem('csrf_token');
    if (!redirectingToLogin && !window.location.pathname.endsWith('/login')) {
        redirectingToLogin = true;
        const base = import.meta.env.BASE_URL || '/';
        const basePath = base.replace(/\/$/, '');
        const current = window.location.pathname + window.location.search;
        const next = current.startsWith(basePath) ? current.slice(basePath.length) : current;
        const target = next && next !== '/'
            ? `${basePath}/login?next=${encodeURIComponent(next)}`
            : `${basePath}/login`;
        setTimeout(() => { window.location.href = target; }, 0);
    }
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;

        if (error.response?.data && Array.isArray(error.response.data.detail)) {
            error.response.data.detail = humanizeDetail(error.response.data.detail);
        }

        if (error.response?.status === 401) {
            if (original && !original.__refreshRetried && !isAuthEndpoint(original.url)) {
                original.__refreshRetried = true;
                const refreshed = await refreshSession();
                if (refreshed) {
                    return api.request(original);
                }
            }
            redirectToLogin();
            return Promise.reject(error);
        }

        if (error.response?.status === 403 && import.meta.env.DEV) {
            console.warn('[api] 403 detail:', error.response?.data?.detail, 'isCsrf:', isCsrfError(error), 'retried:', original?.__csrfRetried);
        }

        if (isCsrfError(error) && original && !original.__csrfRetried) {
            original.__csrfRetried = true;
            const newToken = await refreshCsrfToken();
            if (import.meta.env.DEV) console.warn('[api] csrf refreshed:', Boolean(newToken));
            if (newToken) {
                if (original.headers && typeof original.headers.set === 'function') {
                    original.headers.set('X-CSRF-Token', newToken);
                } else {
                    original.headers = original.headers || {};
                    original.headers['X-CSRF-Token'] = newToken;
                }
                return api.request(original);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
