const _tiposCache = new Map();

export async function fetchTipos(endpointBase) {
    const url = endpointBase.replace(/\/$/, '') + '/tipos';
    if (_tiposCache.has(url)) return _tiposCache.get(url);
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) throw new Error(`tipos http ${res.status}`);
    const data = await res.json();
    _tiposCache.set(url, data);
    setTimeout(() => _tiposCache.delete(url), 5 * 60 * 1000);
    return data;
}

export async function postReporte({ endpoint, apiKey, payload, screenshot }) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(payload || {})) {
        if (value === null || value === undefined) continue;
        if (typeof value === 'object') {
            formData.append(key, JSON.stringify(value));
        } else {
            formData.append(key, value);
        }
    }
    if (screenshot) formData.append('screenshot', screenshot);

    const headers = {};
    if (apiKey) headers['X-Colibri-Key'] = apiKey;

    const res = await fetch(endpoint, { method: 'POST', body: formData, headers });
    if (!res.ok) {
        let detail = `http ${res.status}`;
        try {
            const body = await res.json();
            detail = body?.detail || detail;
            if (Array.isArray(detail)) {
                detail = detail.map((d) => d.msg || JSON.stringify(d)).join('; ');
            }
        } catch { /* ignore */ }
        const err = new Error(detail);
        err.status = res.status;
        throw err;
    }
    return res.json();
}

export function captureAuto() {
    const auto = {
        url: location.href,
        referrer: document.referrer || undefined,
        userAgent: navigator.userAgent,
        lang: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timestamp: new Date().toISOString(),
        viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
            dpr: window.devicePixelRatio || 1,
        },
    };
    return auto;
}
