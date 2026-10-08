export const ALCANCE_EN_LINEA = 'en-linea';
export const ALCANCE_LOCAL = 'local';
export const ALCANCE_AMBOS = 'ambos';

export const ENTORNO_NO_PROD = ['dev', 'beta'].includes(import.meta.env.VITE_APP_ENV);

export const alcanceDe = (origen) => origen.alcance || ALCANCE_EN_LINEA;

export const visibleEn = (origen, alcance) => {
    const propio = alcanceDe(origen);
    return propio === ALCANCE_AMBOS || propio === alcance;
};
