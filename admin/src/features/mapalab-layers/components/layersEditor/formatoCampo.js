export const FORMATO_ANIO = 'anio';

const PREFIJO_ISO = /^(\d{4})-\d{2}-\d{2}/;
const LLAVES_SIMPLES = new Set(['field', 'formato']);

const anioDe = (valor) => {
    const texto = String(valor).trim();
    const iso = texto.match(PREFIJO_ISO);
    if (iso) return iso[1];
    const fecha = new Date(texto);
    return Number.isNaN(fecha.getTime()) ? null : String(fecha.getUTCFullYear());
};

export const aplicarFormato = (valor, formato) => {
    if (formato !== FORMATO_ANIO) return valor;
    if (valor === null || valor === undefined || valor === '') return valor;
    return anioDe(valor) ?? valor;
};

export const esAnio = (item) => item?.formato === FORMATO_ANIO;

export const conAnio = (item, activo) => {
    const { formato: _formato, ...resto } = item || {};
    return activo ? { ...resto, formato: FORMATO_ANIO } : resto;
};

export const nombreDeCampo = (entrada) => (typeof entrada === 'string' ? entrada : entrada?.field || '');

export const esCampoSimple = (entrada) => typeof entrada === 'string'
    || (!!entrada && typeof entrada === 'object' && Object.keys(entrada).every((k) => LLAVES_SIMPLES.has(k)));

export const esCampoConEstilo = (entrada) => !!entrada && typeof entrada === 'object' && !esCampoSimple(entrada);

export const camposConAnio = (campos = []) => campos.filter(esAnio).map(nombreDeCampo).filter(Boolean);

export const marcarAnio = (campos = [], nombres = []) => {
    const elegidos = new Set(nombres);
    return campos.map((entrada) => {
        const nombre = nombreDeCampo(entrada);
        if (!nombre) return entrada;
        const base = typeof entrada === 'string' ? { field: entrada } : entrada;
        const siguiente = conAnio(base, elegidos.has(nombre));
        return esCampoSimple(siguiente) && !siguiente.formato ? siguiente.field : siguiente;
    });
};

export const elegirCamposSimples = (campos = [], nombres = []) => {
    const elegidos = new Set(nombres);
    const presentes = new Set();
    const conservados = campos.filter((entrada) => {
        if (!esCampoSimple(entrada)) return true;
        const nombre = nombreDeCampo(entrada);
        if (!elegidos.has(nombre) || presentes.has(nombre)) return false;
        presentes.add(nombre);
        return true;
    });
    return [...conservados, ...nombres.filter((nombre) => !presentes.has(nombre))];
};
