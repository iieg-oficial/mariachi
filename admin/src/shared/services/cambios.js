import api from '@shared/services/api';

const REINTENTO_MS = 15000;
const oyentes = new Set();
let fuente = null;
let reintento = null;
let yaAbrio = false;

const repartir = (evento) => {
    oyentes.forEach((oyente) => oyente(evento));
};

const conectar = () => {
    clearTimeout(reintento);
    if (fuente || !oyentes.size || typeof EventSource === 'undefined') return;
    fuente = new EventSource(`${api.defaults.baseURL}/cambios/stream`, { withCredentials: true });
    fuente.onopen = () => {
        if (yaAbrio) repartir({ tipo: 'reconectado' });
        yaAbrio = true;
    };
    fuente.onmessage = (mensaje) => {
        try {
            repartir(JSON.parse(mensaje.data));
        } catch { /* mensaje ilegible */ }
    };
    fuente.onerror = () => {
        if (fuente?.readyState !== EventSource.CLOSED) return;
        fuente = null;
        reintento = setTimeout(conectar, REINTENTO_MS);
    };
};

const desconectar = () => {
    clearTimeout(reintento);
    fuente?.close();
    fuente = null;
    yaAbrio = false;
};

export const escucharCambios = (oyente) => {
    oyentes.add(oyente);
    conectar();
    return () => {
        oyentes.delete(oyente);
        if (!oyentes.size) desconectar();
    };
};

export const rutaMenciona = (ruta, id) => String(ruta || '')
    .split('/')
    .some((segmento) => {
        try {
            return decodeURIComponent(segmento) === String(id);
        } catch {
            return segmento === String(id);
        }
    });
