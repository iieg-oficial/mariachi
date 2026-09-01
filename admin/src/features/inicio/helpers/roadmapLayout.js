import { LOGO_PROYECTO } from '@features/inicio/constants/roadmapLogos';
import {
    ANIOS,
    CARRIL_ABAJO,
    COLOR_PROYECTO,
    ESPINA_Y,
    NIVELES,
} from '@features/inicio/constants/roadmapModelo';

export const colorDe = (hito) => COLOR_PROYECTO[hito.proy] || COLOR_PROYECTO.infra;

export const logoDe = (hito) => (
    hito.tipo === 'feature' || hito.tipo === 'momento' ? null : LOGO_PROYECTO[hito.proy] || null
);

export const esMuerto = (hito) => hito.tipo === 'muerto' || Boolean(hito.muerto);

export const partes = (hito) => (
    hito.txt.includes(' · ') ? hito.txt.split(' · ') : [hito.txt]
);

export const ejeX = (fecha) => {
    const [anio, mes, dia] = fecha.split('-').map(Number);
    const tramo = ANIOS.find((a) => a.anio === anio) || ANIOS[0];
    const fraccion = (mes - 1 + (dia - 1) / 30) / 12;
    return tramo.x0 + fraccion * (tramo.x1 - tramo.x0);
};

export const fechaEnX = (x) => {
    const tramo = ANIOS.find((a) => x >= a.x0 && x <= a.x1)
        || (x < ANIOS[0].x0 ? ANIOS[0] : ANIOS[ANIOS.length - 1]);
    const fraccion = Math.min(0.999, Math.max(0, (x - tramo.x0) / (tramo.x1 - tramo.x0)));
    const mes = Math.min(11, Math.floor(fraccion * 12));
    const dia = Math.min(28, Math.max(1, Math.round(((fraccion * 12) - mes) * 30) + 1));
    return `${tramo.anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
};

export const anchoDe = (hito) => {
    const lineas = partes(hito);
    const ancho = lineas.reduce((maximo, linea, indice) => {
        const factor = indice === 0 && lineas.length > 1 ? 6.6 : 7.9;
        return Math.max(maximo, linea.length * factor);
    }, 0);
    return Math.max(112, ancho + 26);
};

export const altoDe = (hito) => {
    if (logoDe(hito)) return 52;
    if (partes(hito).length > 1) return 42;
    return hito.antes ? 46 : 32;
};

const anchoMomento = (hito) => hito.txt.length * 6.6 + 22;

const colocarMomento = (hito, finCarril) => {
    const ancho = anchoMomento(hito);
    let carril = finCarril.findIndex((fin) => hito.px - ancho / 2 >= fin + 14);
    if (carril === -1) {
        carril = finCarril.indexOf(Math.min(...finCarril));
    }
    const lx = Math.max(hito.px, finCarril[carril] + 14 + ancho / 2);
    return { ...hito, lx, ly: CARRIL_ABAJO[carril], carril, finCarril: lx + ancho / 2 };
};

const colocarNodo = (hito, finNivel) => {
    const ancho = anchoDe(hito);
    let nivel = finNivel.findIndex((fin) => hito.px - ancho / 2 >= fin + 16);
    let lx = hito.px;
    if (nivel === -1) {
        nivel = finNivel.indexOf(Math.min(...finNivel));
        lx = finNivel[nivel] + 16 + ancho / 2;
    }
    return { ...hito, lx, ly: NIVELES[nivel], nivel, finNivel: lx + ancho / 2 };
};

export const acomodar = (hitos) => {
    const finNivel = NIVELES.map(() => -1e9);
    const finCarril = CARRIL_ABAJO.map(() => -1e9);

    return [...hitos]
        .map((hito) => ({ ...hito, px: ejeX(hito.f) }))
        .sort((a, b) => a.px - b.px)
        .map((hito) => {
            if (hito.tipo === 'momento') {
                const puesto = colocarMomento(hito, finCarril);
                finCarril[puesto.carril] = puesto.finCarril;
                return puesto;
            }
            const puesto = colocarNodo(hito, finNivel);
            finNivel[puesto.nivel] = puesto.finNivel;
            return puesto;
        });
};

export const bordeDelNodo = (hito) => (
    hito.ly < ESPINA_Y ? hito.ly + altoDe(hito) / 2 : hito.ly - altoDe(hito) / 2
);

export const tinte = (hex, alfa) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alfa})`;
};
