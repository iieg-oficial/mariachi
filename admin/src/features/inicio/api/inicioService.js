import api from '@shared/services/api';

export const getMisBorradores = async () => {
    const res = await api.get('/borradores/mios');
    return res.data;
};

export const getBorradoresPendientes = async () => {
    const res = await api.get('/borradores/pendientes');
    return res.data;
};

const GITHUB_ORG = 'https://github.com/iieg-oficial';
const TAIGA_BASE = 'https://proyectosiieg.jalisco.gob.mx/project';

const PLATAFORMAS_META = [
    { slug: 'mariachi', label: 'Mariachi', url: '/inicio', repo: `${GITHUB_ORG}/mariachi`, taiga: `${TAIGA_BASE}/nuevo-sitio-del-iieg` },
    { slug: 'mapalab', label: 'MapaLab', url: '/mapa', repo: `${GITHUB_ORG}/mapalab`, taiga: `${TAIGA_BASE}/mapalab` },
    { slug: 'dataengine', label: 'DataEngine', url: null, repo: `${GITHUB_ORG}/dataengine`, taiga: null },
    { slug: 'acervo', label: 'Acervo', url: null, repo: `${GITHUB_ORG}/acervo`, taiga: null },
    { slug: 'gateway-hub', label: 'Gateway Hub', url: null, repo: `${GITHUB_ORG}/gateway-hub`, taiga: null },
    { slug: 'huachicol', label: 'Huachicol', url: null, repo: `${GITHUB_ORG}/huachicol`, taiga: null },
    { slug: 'geoserver', label: 'GeoServer', url: null, repo: `${GITHUB_ORG}/geoserver`, taiga: null },
    { slug: 'sieej', label: 'SIEEJ', url: '/sieej', repo: `${GITHUB_ORG}/sieej`, taiga: `${TAIGA_BASE}/siiej` },
];

export const getPlataformas = async () => {
    const res = await api.get('/sistema/monitor/status');
    const services = res.data?.services ?? [];
    const bySlug = new Map(services.map((s) => [s.slug, s]));
    return PLATAFORMAS_META.map((meta) => {
        const s = bySlug.get(meta.slug);
        return {
            slug: meta.slug,
            label: meta.label,
            url: meta.url,
            repo: meta.repo,
            taiga: meta.taiga,
            version: s?.version ?? null,
            healthy: s?.healthy ?? false,
            status: s?.status ?? null,
            since_human: s?.since_human ?? null,
            uptime_24h: s?.uptime_24h ?? null,
            containers: s?.container_summary ?? null,
            detail: s?.detail ?? null,
            monitored: Boolean(s),
        };
    });
};

export const getNotasVersion = async (limit = 5) => {
    const res = await api.get(`/sistema/notas-version?limit=${limit}`);
    return res.data;
};

export const getColibriConfig = async () => {
    const res = await api.get('/sistema/colibri-config');
    return res.data;
};
