import api from '@shared/services/api';

export const REFRESCO_NODOS_MS = 20000;

export const POSICIONES = {
    S1: { x: 80, y: 170, w: 132, h: 76 },
    S2: { x: 390, y: 60, w: 132, h: 76 },
    S5: { x: 390, y: 170, w: 132, h: 76 },
    S3: { x: 390, y: 280, w: 132, h: 76 },
    S4: { x: 700, y: 170, w: 132, h: 76 },
    'pmx-vine-wacha': { x: 390, y: 110, w: 168, h: 76 },
};

const POSICION_POR_OMISION = { x: 390, y: 380, w: 132, h: 76 };

export const NODOS_META = {
    S1: { host: 'gateway', rol: 'gateway · acervo · mariachi · huachicol' },
    S2: { host: 'mapalab', rol: 'mapalab' },
    S3: { host: 'sextante', rol: 'sextante' },
    S4: { host: 'dataengine', rol: 'dataengine', aislado: true },
    S5: { host: 'portalito', rol: 'portalito' },
    'pmx-vine-wacha': { host: 'pmx-vine-wacha', rol: 'vine · wacha', soloProxmox: true },
    'sin-nodo': { rol: 'sin ONTOY_NODE declarado' },
};

const PREFIJO_ESPEJO = 'pmx-';

export const hostnameDe = (nodo, ambiente) => {
    const base = NODOS_META[nodo]?.host;
    if (!base) return null;
    const enEspejo = (ambiente || '').toLowerCase().includes('proxmox');
    return enEspejo && !base.startsWith(PREFIJO_ESPEJO) ? `${PREFIJO_ESPEJO}${base}` : base;
};

const acomodar = (nodos, ambiente) => nodos.map((nodo, indice) => {
    const posicion = POSICIONES[nodo.node]
        || { ...POSICION_POR_OMISION, x: POSICION_POR_OMISION.x + indice * 20 };
    const meta = NODOS_META[nodo.node] || {};
    return { ...nodo, ...posicion, ...meta, hostname: hostnameDe(nodo.node, ambiente) };
});

export const aristasDe = (nodos) => {
    const conocidos = new Set(nodos.map((n) => n.node));
    const aristas = [];
    nodos.forEach((nodo) => {
        Object.entries(nodo.peers || {}).forEach(([destino, check]) => {
            if (!conocidos.has(destino)) return;
            aristas.push({
                de: nodo.node,
                a: destino,
                ms: check.latency_ms ?? null,
                estado: check.status === 'ok' ? 'ok' : 'down',
                detalle: check.detail || null,
            });
        });
    });
    return aristas;
};

export const getNodos = async (eventos = 20) => {
    const res = await api.get(`/sistema/monitor/nodos?eventos=${eventos}`);
    const ambiente = res.data?.environment ?? null;
    const nodos = acomodar(res.data?.nodos ?? [], ambiente);
    return {
        environment: ambiente,
        nodos,
        aristas: aristasDe(nodos),
        eventos: res.data?.eventos ?? [],
    };
};
