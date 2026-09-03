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
    sitio2026: {
        label: 'Portalito',
        capa: 'entrada',
        url: '/',
        repo: `${GITHUB_ORG}/sitio2026`,
    },
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
    frames: { label: 'Frames', capa: 'internos', repo: `${GITHUB_ORG}/frames` },
};

export const ORDEN_CAPA = CAPAS.reduce((acc, capa, indice) => ({ ...acc, [capa.key]: indice }), {});

export const metaServicio = (slug) => CATALOGO[slug] || {};

export const aPlataforma = (servicio) => {
    const meta = metaServicio(servicio.slug);
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
