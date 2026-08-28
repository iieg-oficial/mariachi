import api from '@shared/services/api';

export const REFRESCO_NODOS_MS = 20000;

export const NODO_INTERNET = 'internet';

export const POSICIONES = {
    [NODO_INTERNET]: { x: 30, y: 30, w: 132, h: 66 },
    S1: { x: 80, y: 170, w: 132, h: 76 },
    S2: { x: 390, y: 60, w: 132, h: 76 },
    S5: { x: 390, y: 170, w: 132, h: 76 },
    S3: { x: 390, y: 280, w: 132, h: 76 },
    S4: { x: 700, y: 170, w: 132, h: 76 },
    'pmx-vine-wacha': { x: 390, y: 110, w: 168, h: 76 },
};

const POSICION_POR_OMISION = { x: 390, y: 380, w: 132, h: 76 };

export const NODOS_META = {
    S1: { nombreHost: 'gateway', rol: 'gateway · acervo · mariachi · huachicol' },
    S2: { nombreHost: 'mapalab', rol: 'mapalab' },
    S3: { nombreHost: 'sextante', rol: 'sextante' },
    S4: { nombreHost: 'dataengine', rol: 'dataengine', aislado: true },
    S5: { nombreHost: 'portalito', rol: 'portalito' },
    'pmx-vine-wacha': { nombreHost: 'pmx-vine-wacha', rol: 'vine · wacha', soloProxmox: true },
    'sin-nodo': { rol: 'sin ONTOY_NODE declarado' },
    [NODO_INTERNET]: { rol: 'entrada pública', sintetico: true },
};

const ENTRADA_PUBLICA = {
    node: NODO_INTERNET,
    status: 'ok',
    servicios: [],
    host: {},
    peers: {},
    containers: { total: 0, running: 0 },
    contenedores: [],
    puertos: [
        { nombre: 'http', puerto: 80, status: 'ok', servicio: NODO_INTERNET },
        { nombre: 'https', puerto: 443, status: 'ok', servicio: NODO_INTERNET },
    ],
};

const dominioActual = () => {
    if (typeof window === 'undefined') return null;
    return window.location.hostname || null;
};

const PREFIJO_ESPEJO = 'pmx-';

export const hostnameDe = (nodo, ambiente) => {
    const base = NODOS_META[nodo]?.nombreHost;
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
                puerto: check.port ?? null,
                estado: check.status === 'ok' ? 'ok' : 'down',
                detalle: check.detail || null,
            });
        });
    });
    return aristas;
};

const NODO_ENTRADA = 'S1';

export const getNodos = async (eventos = 20) => {
    const res = await api.get(`/sistema/monitor/nodos?eventos=${eventos}`);
    const ambiente = res.data?.environment ?? null;
    const reportados = res.data?.nodos ?? [];
    const conEntrada = reportados.some((n) => n.node === NODO_ENTRADA)
        ? [{ ...ENTRADA_PUBLICA, dominio: dominioActual() }, ...reportados]
        : reportados;
    const nodos = acomodar(conEntrada, ambiente);
    const aristas = aristasDe(nodos);

    if (nodos.some((n) => n.node === NODO_INTERNET)) {
        aristas.unshift({
            de: NODO_INTERNET,
            a: NODO_ENTRADA,
            ms: null,
            estado: 'ok',
            detalle: null,
            publica: true,
        });
    }

    return {
        environment: ambiente,
        nodos,
        aristas,
        eventos: res.data?.eventos ?? [],
    };
};

export const getHistorialNodo = async (nodo, horas = 24) => {
    const res = await api.get(`/sistema/monitor/nodos/${nodo}/historial?horas=${horas}`);
    return res.data?.muestras ?? [];
};

export const seriesDeTemperatura = (muestras) => {
    const porSensor = new Map();
    muestras.forEach((muestra) => {
        (muestra.temperaturas || []).forEach(({ nombre, celsius }) => {
            if (!porSensor.has(nombre)) porSensor.set(nombre, []);
            porSensor.get(nombre).push({ momento: muestra.medido_en, celsius });
        });
    });
    return Array.from(porSensor, ([nombre, puntos]) => ({ nombre, puntos }));
};
