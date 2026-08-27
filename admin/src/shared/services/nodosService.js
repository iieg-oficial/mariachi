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
    S1: { rol: 'gateway · acervo · mariachi · huachicol' },
    S2: { rol: 'mapalab' },
    S3: { rol: 'sextante' },
    S4: { rol: 'dataengine', aislado: true },
    S5: { rol: 'portalito' },
    'pmx-vine-wacha': { rol: 'vine · wacha', soloProxmox: true },
    'sin-nodo': { rol: 'sin ONTOY_NODE declarado' },
};

const acomodar = (nodos) => nodos.map((nodo, indice) => {
    const posicion = POSICIONES[nodo.node]
        || { ...POSICION_POR_OMISION, x: POSICION_POR_OMISION.x + indice * 20 };
    const meta = NODOS_META[nodo.node] || {};
    return { ...nodo, ...posicion, ...meta };
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
    const nodos = acomodar(res.data?.nodos ?? []);
    return {
        environment: res.data?.environment ?? null,
        nodos,
        aristas: aristasDe(nodos),
        eventos: res.data?.eventos ?? [],
    };
};
