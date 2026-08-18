export const ALTO = 320;
export const FACHADA_Y = 160;
export const HUECO = 34;
export const MURO = 24;
export const PILAR_ALTO = 88;
export const PILAR_RADIO = 7;
export const TUBO_R = 10;
export const GAP = 9;
export const VANO = 150;
export const VANO_ACCESIBLE = 160;
export const GROSOR_FLECHA = 18;
export const PUNTA = 13;
export const LECTOR_ANCHO = 8;
export const LECTOR_ALTO = 15;
export const APERTURA = 40;
export const MARGEN = 72;

export const Y = {
    nombre: 14,
    lectorSalida: 36,
    cifraSalida: 52,
    flecha: [64, 268],
    cifraEntrada: 286,
    lectorEntrada: 302,
};

const VANOS = [VANO_ACCESIBLE, VANO, VANO];

export const ANCHO_FACHADA = MURO * (VANOS.length + 1) + VANOS.reduce((a, b) => a + b, 0);
export const ANCHO = ANCHO_FACHADA + MARGEN * 2;
export const INICIO = MARGEN;

export const anchoVano = (i) => VANOS[i];

export const xMuro = (i) => INICIO + i * MURO + VANOS.slice(0, i).reduce((a, b) => a + b, 0);

export const xVano = (i) => xMuro(i) + MURO;

export const centroMuro = (i) => xMuro(i) + MURO / 2;

export const miles = (v) => (v ?? 0).toLocaleString('es-MX');
