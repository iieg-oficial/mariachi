import {
    COLOR_TARDE, TEXTURA_TARDE, SEGMENTOS_JORNADA, TEXTURA_MINIMO, TEXTURA_SIN_MARCA, formatoMinutos,
} from '@features/vine/constants/jornada';

const minutosDe = (d, clave) => d[clave] ?? (d.tramos ?? [])
    .filter(([tipo]) => tipo === clave)
    .reduce((t, [, desde, hasta]) => t + (hasta - desde), 0);

export const glifoDe = (d) => (d.estado === 'asistio'
    ? (d.cerro ? (d.retardo ? '●' : '') : '○')
    : ESTADOS[d.estado]?.glifo ?? '');

export const estiloTramo = (tipo) => {
    if (tipo === 'tarde') return TARDE;
    if (tipo === 'minimo') return MINIMO;
    const segmento = SEGMENTOS_JORNADA.find((s) => s.clave === tipo);
    return segmento ? fondo(segmento) : {};
};

export const ESTADOS = {
    inhabil: { glifo: '✕', texto: 'Inhábil' },
    incidencia: { glifo: '◆', texto: 'Incidencia' },
};

export const fondo = (s) => (s.textura
    ? { backgroundImage: TEXTURA_SIN_MARCA, boxShadow: `inset 0 0 0 1px ${s.color}` }
    : { background: s.color });

export const TARDE = { backgroundImage: TEXTURA_TARDE, boxShadow: `inset 0 0 0 1px ${COLOR_TARDE}` };

export const MINIMO = { backgroundImage: TEXTURA_MINIMO, boxShadow: `inset 0 0 0 1px ${SEGMENTOS_JORNADA[0].color}` };

export const detalle = (d, horaEntrada) => {
    if (d.personas) return detalleInstituto(d);
    if (d.estado !== 'asistio') {
        const motivo = d.incidencia?.nombre ?? ESTADOS[d.estado]?.texto ?? 'Sin registro';
        return `${d.dia} · ${motivo}`;
    }
    const lineas = [`${d.dia} · ${d.entrada ?? '—'} a ${d.salida ?? 'sin salida'}`];
    if (d.en_curso) lineas.push('Día en curso: puede cambiar con las siguientes marcas');
    if (d.hasta_al_menos) lineas.push(`Estuvo al menos de ${d.entrada} a ${d.hasta_al_menos} (${formatoMinutos(d.minimo)})`);
    if (d.reentrada) lineas.push(`Volvió a entrar a las ${d.reentrada} y no marcó salida: la jornada no cerró`);
    else if (!d.cerro) lineas.push('La jornada no cerró: no hay salida que medir');
    if (d.visita) lineas.push('Visita corta: menos de una hora, no es una jornada');
    SEGMENTOS_JORNADA.forEach((s) => {
        const minutos = minutosDe(d, s.clave);
        if (minutos) lineas.push(`${s.nombre}: ${formatoMinutos(minutos)}`);
    });
    if (d.tarde > 0) {
        lineas.push(`No llegó a su hora: ${formatoMinutos(d.tarde)}${horaEntrada ? ` después de las ${horaEntrada}` : ''}`);
    }
    if (d.retardo) lineas.push('Pasó la tolerancia: cuenta como retardo');
    if (d.incidencia) lineas.push(d.incidencia.nombre);
    return lineas.map((l) => <div key={l}>{l}</div>);
};

const detalleInstituto = (d) => [
    `${d.dia} · promedio de ${d.personas} personas con jornada cerrada`,
    ...SEGMENTOS_JORNADA.filter((s) => d[s.clave]).map((s) => `${s.nombre}: ${formatoMinutos(d[s.clave])}`),
    d.tarde > 0 && `Llegaron ${formatoMinutos(d.tarde)} después de su hora en promedio`,
    d.retardos > 0 && `${d.retardos} retardos`,
    d.en_curso && 'Día en curso: puede cambiar',
].filter(Boolean).map((l) => <div key={l}>{l}</div>);

export const ORDEN_REPARTO = ['antes', 'dentro', 'despues', 'afuera', 'sin_marca'];

export const totalReparto = (r) => (r ? ORDEN_REPARTO.reduce((t, k) => t + (r[k] ?? 0), 0) + (r.tarde ?? 0) : 0);
