const SIN_ACENTO = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n' };

export const aNombreInterno = (etiqueta) => (etiqueta || '')
    .toLowerCase()
    .replace(/[áéíóúüñ]/g, (c) => SIN_ACENTO[c])
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^[^a-z]+/, '')
    .replace(/_+$/, '')
    .slice(0, 20)
    .replace(/_+$/, '');

export const rutaDeCanal = (canal, sub = false) => `${canal}${sub ? '02' : '01'}`;

export const RUTA_DIRECTA = '/Streaming/Channels/101';
export const RUTA_DIRECTA_SUB = '/Streaming/Channels/102';

export const componerRtsp = ({ usuario, contrasena, host, puerto = 554, canal, ruta, sub = false }) => {
    if (!host) return '';
    const credencial = usuario ? `${usuario}:${contrasena || ''}@` : '';
    const predeterminada = sub ? RUTA_DIRECTA_SUB : RUTA_DIRECTA;
    const cola = canal ? `/Streaming/Channels/${rutaDeCanal(canal, sub)}` : (ruta ?? predeterminada);
    return `rtsp://${credencial}${host}:${puerto}${cola}`;
};

export const enmascarar = (url) => (url || '').replace(/:\/\/([^:@/]+):[^@]*@/, '://$1:•••@');

export const CONEXION_NVR = 'nvr';
export const CONEXION_DIRECTA = 'directa';

const LLAVE = 'frames.ultimaConexion';

export const recordarConexion = (datos) => {
    try {
        localStorage.setItem(LLAVE, JSON.stringify(datos));
    } catch {
        return;
    }
};

export const conexionRecordada = () => {
    try {
        return JSON.parse(localStorage.getItem(LLAVE)) || null;
    } catch {
        return null;
    }
};
