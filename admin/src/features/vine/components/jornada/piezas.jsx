import {
    COLOR_TARDE, FONDO_VISITA, SEGMENTOS_JORNADA, TEXTURA_MINIMO, TEXTURA_SIN_MARCA, TEXTURA_TARDE, formatoMinutos,
} from '@features/vine/constants/jornada';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const fechaLarga = (iso) => {
    const [a, m, d] = iso.split('-').map(Number);
    return `${DIAS[new Date(a, m - 1, d).getDay()]} ${d}/${String(m).padStart(2, '0')}/${a}`;
};

const minutosDe = (d, clave) => d[clave] ?? (d.tramos ?? [])
    .filter(([tipo]) => tipo === clave)
    .reduce((t, [, desde, hasta]) => t + (hasta - desde), 0);

export const ESTADOS = {
    inhabil: { glifo: '✕', texto: 'Inhábil' },
    incidencia: { glifo: '◆', texto: 'Incidencia' },
};

export const glifoDe = (d) => {
    if (d.estado !== 'asistio') return ESTADOS[d.estado]?.glifo ?? '';
    if (d.inhabil) return ESTADOS.inhabil.glifo;
    if (d.visita) return '';
    if (!d.cerro) return '○';
    return d.retardo ? '●' : '';
};

export const fondo = (s) => (s.textura
    ? { backgroundImage: TEXTURA_SIN_MARCA, boxShadow: `inset 0 0 0 1px ${s.color}` }
    : { background: s.color });

export const TARDE = { backgroundImage: TEXTURA_TARDE, boxShadow: `inset 0 0 0 1px ${COLOR_TARDE}` };

export const MINIMO = { backgroundImage: TEXTURA_MINIMO, boxShadow: `inset 0 0 0 1px ${SEGMENTOS_JORNADA[0].color}` };

export const VISITA = { background: FONDO_VISITA, boxShadow: `inset 0 0 0 1px ${SEGMENTOS_JORNADA[0].color}` };

export const estiloTramo = (tipo) => {
    if (tipo === 'tarde') return TARDE;
    if (tipo === 'minimo') return MINIMO;
    if (tipo === 'visita') return VISITA;
    const segmento = SEGMENTOS_JORNADA.find((s) => s.clave === tipo);
    return segmento ? fondo(segmento) : {};
};

export const radiosDe = (tramos, i, radio) => {
    const pega = (a, b) => a && b && a[2] >= b[1];
    const inicio = pega(tramos[i - 1], tramos[i]) ? 0 : radio;
    const fin = pega(tramos[i], tramos[i + 1]) ? 0 : radio;
    return { inicio, fin };
};

const renglon = (clave, estilo, etiqueta, valor) => (
    <div key={clave} style={{ display: 'grid', gridTemplateColumns: '10px 1fr auto', gap: 8, alignItems: 'center' }}>
        <span style={{ width: 10, height: 10, borderRadius: 2, ...estilo }} />
        <span>{etiqueta}</span>
        <span style={{ fontVariantNumeric: 'tabular-nums', opacity: 0.85 }}>{valor}</span>
    </div>
);

const tarjeta = (titulo, subtitulo, renglones, notas) => (
    <div style={{ minWidth: 210, fontSize: 12, lineHeight: '18px' }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{titulo}</div>
        {subtitulo && <div style={{ opacity: 0.75, marginBottom: renglones.length ? 6 : 0 }}>{subtitulo}</div>}
        {renglones}
        {notas.length > 0 && (
            <div style={{ marginTop: 6, opacity: 0.8, fontSize: 11 }}>
                {notas.map((n) => <div key={n}>{n}</div>)}
            </div>
        )}
    </div>
);

export const detalle = (d, horaEntrada) => {
    if (d.personas) return detalleInstituto(d);
    if (d.estado !== 'asistio') {
        return tarjeta(fechaLarga(d.dia), d.incidencia?.nombre ?? ESTADOS[d.estado]?.texto ?? 'Sin registro', [], []);
    }
    const subtitulo = [
        `${d.entrada ?? '—'} → ${d.salida ?? (d.hasta_al_menos ? `al menos ${d.hasta_al_menos}` : 'sin salida')}`,
        d.horas && formatoMinutos(d.horas * 60),
    ].filter(Boolean).join(' · ');
    const renglones = [];
    if (d.tarde > 0) {
        renglones.push(renglon('tarde', TARDE, `Llegó tarde${horaEntrada ? ` (${horaEntrada})` : ''}`, formatoMinutos(d.tarde)));
    }
    if (d.visita) renglones.push(renglon('visita', VISITA, 'Visita corta', formatoMinutos((d.horas ?? 0) * 60)));
    else {
        SEGMENTOS_JORNADA.forEach((s) => {
            const minutos = minutosDe(d, s.clave);
            if (minutos) renglones.push(renglon(s.clave, fondo(s), s.nombre, formatoMinutos(minutos)));
        });
        if (d.minimo && !d.cerro) renglones.push(renglon('minimo', MINIMO, 'Al menos', formatoMinutos(d.minimo)));
    }
    const notas = [
        d.retardo && '● Pasó la tolerancia: cuenta como retardo',
        d.reentrada && `○ Volvió a entrar a las ${d.reentrada} y no marcó salida`,
        !d.reentrada && !d.cerro && !d.visita && '○ La jornada no cerró',
        d.visita && 'Menos de una hora: no cuenta como jornada',
        d.inhabil && '✕ Día inhábil: vino sin obligación, no cuenta retardo',
        !d.inhabil && d.sin_obligacion && 'Día sin obligación de venir: no cuenta retardo',
        d.en_curso && 'Día en curso: puede cambiar',
        d.incidencia && `◆ ${d.incidencia.nombre}`,
    ].filter(Boolean);
    return tarjeta(fechaLarga(d.dia), subtitulo, renglones, notas);
};

const detalleInstituto = (d) => tarjeta(
    fechaLarga(d.dia),
    `promedio de ${d.personas} personas`,
    [
        ...(d.tarde > 0 ? [renglon('tarde', TARDE, 'Llegaron tarde', formatoMinutos(d.tarde))] : []),
        ...SEGMENTOS_JORNADA.filter((s) => d[s.clave]).map((s) => renglon(s.clave, fondo(s), s.nombre, formatoMinutos(d[s.clave]))),
    ],
    [d.retardos > 0 && `● ${d.retardos} retardos`, d.en_curso && 'Día en curso: puede cambiar'].filter(Boolean),
);

export const detalleReparto = (reparto, sufijo) => tarjeta(
    sufijo ? 'Jornada promedio' : 'Total del periodo',
    reparto.jornadas && `${reparto.jornadas} jornadas cerradas`,
    [
        ...(reparto.tarde > 0 ? [renglon('tarde', TARDE, 'Llegó tarde', formatoMinutos(reparto.tarde))] : []),
        ...SEGMENTOS_JORNADA.filter((s) => reparto[s.clave] > 0)
            .map((s) => renglon(s.clave, fondo(s), s.nombre, formatoMinutos(reparto[s.clave]))),
    ],
    [],
);

export const ORDEN_REPARTO = ['antes', 'dentro', 'despues', 'afuera', 'sin_marca'];

export const totalReparto = (r) => (r ? ORDEN_REPARTO.reduce((t, k) => t + (r[k] ?? 0), 0) + (r.tarde ?? 0) : 0);
