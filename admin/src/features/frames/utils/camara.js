const SIN_ACENTO = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n' };

export const aNombreInterno = (etiqueta) => (etiqueta || '')
    .toLowerCase()
    .replace(/[áéíóúüñ]/g, (c) => SIN_ACENTO[c])
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^[0-9]+/, '')
    .slice(0, 20)
    .replace(/_+$/, '');

export const rutaDeCanal = (canal) => `${canal}01`;

export const RUTA_DIRECTA = '/Streaming/Channels/101';

export const componerRtsp = ({ usuario, contrasena, host, puerto = 554, canal, ruta }) => {
    if (!host) return '';
    const credencial = usuario ? `${usuario}:${contrasena || ''}@` : '';
    const cola = canal ? `/Streaming/Channels/${rutaDeCanal(canal)}` : (ruta ?? RUTA_DIRECTA);
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
