export function resolveAcervoUrl(url) {
    if (!url || typeof url !== 'string') return null;
    if (/^(https?:\/\/|data:|\/acervo\/|\/api\/)/.test(url)) return url;
    return `/acervo/${url.replace(/^\/+/, '')}`;
}
