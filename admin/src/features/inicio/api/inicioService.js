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

export const CAPAS = [
    { key: 'entrada', nombre: 'Entrada', nota: 'lo que el mundo toca primero' },
    { key: 'datos', nombre: 'Datos', nota: 'si algo falla aquí, lo de arriba falla en consecuencia' },
    { key: 'apps', nombre: 'Aplicaciones', nota: 'lo que la gente usa' },
    { key: 'internos', nombre: 'Internos', nota: 'monitoreo y servicios de otra VM' },
    { key: 'otros', nombre: 'Sin clasificar', nota: 'servicios que el monitor vigila y el catálogo no conoce' },
];

const CATALOGO = {
    'gateway-hub': { label: 'Gateway Hub', capa: 'entrada', repo: `${GITHUB_ORG}/gateway-hub` },
    dataengine: { label: 'DataEngine', capa: 'datos', repo: `${GITHUB_ORG}/dataengine` },
    acervo: { label: 'Acervo', capa: 'datos', repo: `${GITHUB_ORG}/acervo` },
    sextante: { label: 'Sextante', capa: 'datos', repo: `${GITHUB_ORG}/sextante` },
    mariachi: {
        label: 'Mariachi',
        capa: 'apps',
        url: '/inicio',
        repo: `${GITHUB_ORG}/mariachi`,
        taiga: `${TAIGA_BASE}/nuevo-sitio-del-iieg`,
    },
    mapalab: {
        label: 'MapaLab',
        capa: 'apps',
        url: '/mapa',
        repo: `${GITHUB_ORG}/mapalab`,
        taiga: `${TAIGA_BASE}/mapalab`,
    },
    sieej: {
        label: 'SIEEJ',
        capa: 'apps',
        url: '/sieej',
        repo: `${GITHUB_ORG}/sieej`,
        taiga: `${TAIGA_BASE}/siiej`,
    },
    huachicol: { label: 'Huachicol', capa: 'internos', repo: `${GITHUB_ORG}/huachicol` },
    vine: { label: 'Vine', capa: 'internos', repo: `${GITHUB_ORG}/vine` },
    wacha: { label: 'Wacha', capa: 'internos', repo: `${GITHUB_ORG}/wacha` },
};

const ORDEN_CAPA = CAPAS.reduce((acc, capa, indice) => ({ ...acc, [capa.key]: indice }), {});

const aPlataforma = (servicio) => {
    const meta = CATALOGO[servicio.slug] || {};
    return {
        slug: servicio.slug,
        label: meta.label || servicio.label || servicio.slug,
        capa: meta.capa || 'otros',
        url: meta.url || null,
        repo: meta.repo || null,
        taiga: meta.taiga || null,
        version: servicio.version ?? null,
        status: servicio.status ?? null,
        healthy: servicio.healthy ?? false,
        detail: servicio.detail ?? null,
        sinceHuman: servicio.since_human ?? null,
        uptime24h: servicio.uptime_24h ?? null,
        containers: servicio.container_summary ?? null,
        tramos: servicio.uptime_tramos ?? null,
    };
};

export const getPlataformas = async () => {
    const res = await api.get('/sistema/monitor/status');
    const servicios = res.data?.services ?? [];
    return servicios
        .map(aPlataforma)
        .sort((a, b) => (ORDEN_CAPA[a.capa] - ORDEN_CAPA[b.capa]) || a.label.localeCompare(b.label));
};

export const getNotasVersion = async (limit = 5) => {
    const res = await api.get(`/sistema/notas-version?limit=${limit}`);
    return res.data;
};

export const getColibriConfig = async () => {
    const res = await api.get('/sistema/colibri-config');
    return res.data;
};
