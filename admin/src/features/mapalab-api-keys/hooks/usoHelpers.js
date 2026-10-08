const SIN_SITIO = '(sin sitio)';

const vacioSitio = (origen) => ({
    origen,
    cargas: 0,
    listos: 0,
    erroresJs: 0,
    denegados: 0,
    timeouts: 0,
    vitals: {},
});

const vacioVital = () => ({ muestras: 0, suma: 0, buenas: 0, regulares: 0, malas: 0 });

export const diaDe = (valor) => String(valor || '').slice(0, 10);

export const porcentaje = (parte, total) => (total ? Math.round((parte / total) * 100) : null);

export function resumirSitios(sitios = [], rendimiento = []) {
    const mapa = new Map();
    const tomar = (origen) => {
        const clave = origen || SIN_SITIO;
        if (!mapa.has(clave)) mapa.set(clave, vacioSitio(clave));
        return mapa.get(clave);
    };
    for (const fila of sitios) {
        const sitio = tomar(fila.origen);
        sitio.cargas += fila.cargas;
        sitio.listos += fila.listos;
        sitio.erroresJs += fila.erroresJs;
        sitio.denegados += fila.denegados;
        sitio.timeouts += fila.timeouts;
    }
    for (const fila of rendimiento) {
        const sitio = tomar(fila.origen);
        const vital = sitio.vitals[fila.metrica] || vacioVital();
        vital.muestras += fila.muestras;
        vital.suma += fila.suma;
        vital.buenas += fila.buenas;
        vital.regulares += fila.regulares;
        vital.malas += fila.malas;
        sitio.vitals[fila.metrica] = vital;
    }
    return [...mapa.values()].sort((a, b) => b.cargas - a.cargas);
}

export function totalesDelPeriodo(sitios = [], uso = []) {
    const totales = sitios.reduce(
        (acc, fila) => ({
            cargas: acc.cargas + fila.cargas,
            listos: acc.listos + fila.listos,
            erroresJs: acc.erroresJs + fila.erroresJs,
            timeouts: acc.timeouts + fila.timeouts,
        }),
        { cargas: 0, listos: 0, erroresJs: 0, timeouts: 0 },
    );
    const bytes = uso.reduce((acc, fila) => acc + (fila.bytesOut || 0), 0);
    return { ...totales, bytes, pctListo: porcentaje(totales.listos, totales.cargas) };
}

export function seriePorDia(desde, dias, sitios = [], uso = []) {
    const serie = new Map();
    const inicio = new Date(`${desde}T00:00:00`);
    for (let i = 0; i < dias; i += 1) {
        const dia = new Date(inicio);
        dia.setDate(inicio.getDate() + i);
        const clave = `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}`;
        serie.set(clave, { dia: clave, cargas: 0, erroresJs: 0, erroresWms: 0 });
    }
    for (const fila of sitios) {
        const punto = serie.get(diaDe(fila.dia));
        if (!punto) continue;
        punto.cargas += fila.cargas;
        punto.erroresJs += fila.erroresJs;
    }
    for (const fila of uso) {
        const punto = serie.get(diaDe(fila.dia));
        if (punto) punto.erroresWms += fila.errores;
    }
    return [...serie.values()];
}

export function formatoBytes(bytes) {
    if (!bytes) return '0 B';
    const unidades = ['B', 'KB', 'MB', 'GB', 'TB'];
    const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), unidades.length - 1);
    const valor = bytes / 1024 ** exp;
    return `${valor.toLocaleString('es-MX', { maximumFractionDigits: exp ? 1 : 0 })} ${unidades[exp]}`;
}
