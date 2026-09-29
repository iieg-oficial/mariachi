import { Card, Empty, Tooltip, Typography } from 'antd';
import { useMemo } from 'react';

import TituloConAyuda from '@shared/components/TituloConAyuda';
import { EJE_TEXTO } from '@features/vine/constants';
import {
    COLOR_REFERENCIA, COLOR_TARDE, COLOR_TINTA, FONDO_TARDE, JORNADA_ESPERADA_MIN, SEGMENTOS_JORNADA, TEXTURA_MINIMO, TEXTURA_SIN_MARCA,
    formatoMinutos,
} from '@features/vine/constants/jornada';

const { Text } = Typography;

const ALTO = 180;
const ALTO_TARDE_MAX = 48;

const ESTADOS = {
    inhabil: { glifo: '✕', texto: 'Inhábil' },
    incidencia: { glifo: '◆', texto: 'Incidencia' },
};

const fondo = (s) => (s.textura
    ? { backgroundImage: TEXTURA_SIN_MARCA, boxShadow: `inset 0 0 0 1px ${s.color}` }
    : { background: s.color });

const TARDE = { background: FONDO_TARDE, boxShadow: `inset 0 0 0 1px ${COLOR_TARDE}` };

const MINIMO = { backgroundImage: TEXTURA_MINIMO, boxShadow: `inset 0 0 0 1px ${SEGMENTOS_JORNADA[0].color}` };

const Leyenda = () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginBottom: 12 }}>
        {SEGMENTOS_JORNADA.map((s) => (
            <span key={s.clave} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, display: 'inline-block', ...fondo(s) }} />
                <Text style={{ fontSize: 12 }}>{s.nombre}</Text>
            </span>
        ))}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, display: 'inline-block', ...MINIMO }} />
            <Text style={{ fontSize: 12 }}>Al menos (no cerró)</Text>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, display: 'inline-block', ...TARDE }} />
            <Text style={{ fontSize: 12 }}>No llegó a su hora</Text>
        </span>
        <Text style={{ fontSize: 12 }}>● retardo</Text>
        <Text style={{ fontSize: 12 }}>○ no cerró</Text>
        <Text style={{ fontSize: 12 }}>◆ incidencia</Text>
        <Text style={{ fontSize: 12 }}>✕ inhábil</Text>
    </div>
);

const detalle = (d, horaEntrada) => {
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
        if (d[s.clave]) lineas.push(`${s.nombre}: ${formatoMinutos(d[s.clave])}`);
    });
    if (d.tarde > 0) lineas.push(`No llegó a su hora: ${formatoMinutos(d.tarde)} después de las ${horaEntrada}`);
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

const Columna = ({ d, maximo, etiqueta, altoTarde, horaEntrada }) => {
    const glifo = d.estado === 'asistio'
        ? (d.cerro ? (d.retardo ? '●' : '') : '○')
        : ESTADOS[d.estado]?.glifo ?? '';
    return (
        <Tooltip title={detalle(d, horaEntrada)}>
            <div style={{ flex: '1 1 0', minWidth: 8, display: 'flex', flexDirection: 'column', height: '100%', cursor: 'default' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column-reverse', gap: 2, position: 'relative' }}>
                    {d.estado === 'inhabil' && (
                        <div style={{
                            position: 'absolute', top: 0, bottom: 0, left: '50%', borderLeft: `1px dashed ${COLOR_REFERENCIA}`,
                        }}
                        />
                    )}
                    {!d.cerro && d.minimo > 0 && (
                        <div style={{ height: `${(d.minimo / maximo) * 100}%`, borderRadius: '4px 4px 0 0', ...MINIMO }} />
                    )}
                    {d.cerro && SEGMENTOS_JORNADA.filter((s) => d[s.clave] > 0).map((s, i, visibles) => (
                        <div
                            key={s.clave}
                            style={{
                                height: `${(d[s.clave] / maximo) * 100}%`,
                                minHeight: 2,
                                borderRadius: i === visibles.length - 1 ? '4px 4px 0 0' : 0,
                                ...fondo(s),
                            }}
                        />
                    ))}
                </div>
                {altoTarde > 0 && (
                    <div style={{ height: altoTarde, borderTop: `1px solid ${COLOR_REFERENCIA}` }}>
                        {d.tarde > 0 && (
                            <div style={{
                                height: Math.max(2, Math.min(altoTarde, (d.tarde / maximo) * ALTO)),
                                borderRadius: '0 0 4px 4px',
                                ...TARDE,
                            }}
                            />
                        )}
                    </div>
                )}
                <div style={{ ...EJE_TEXTO, color: COLOR_TINTA, textAlign: 'center', height: 14, lineHeight: '14px' }}>
                    {glifo}
                </div>
                <div style={{ ...EJE_TEXTO, textAlign: 'center', whiteSpace: 'nowrap', height: 16 }}>
                    {etiqueta ?? ' '}
                </div>
            </div>
        </Tooltip>
    );
};

const ChartJornadas = ({
    dias = [], horario, loading, titulo: textoTitulo = 'Cómo se repartió cada jornada', ayuda: ayudaFija,
}) => {
    const maximo = useMemo(() => Math.max(
        JORNADA_ESPERADA_MIN * 1.25,
        ...dias.map((d) => Math.max(d.minimo ?? 0, SEGMENTOS_JORNADA.reduce((t, s) => t + (d[s.clave] ?? 0), 0))),
    ), [dias]);

    const ayuda = ayudaFija ?? (horario?.entrada
        ? `Una barra por día, partida contra su horario de ${horario.entrada} a ${horario.salida}. Afuera es el tiempo entre una salida y su regreso; sin marca, el hueco entre dos entradas o dos salidas seguidas, que no se puede atribuir. Debajo de la línea, en rojo, el tiempo que no llegó a su hora; retardo (●) es pasar de ${horario.tolerancia} min.`
        : 'Una barra por día. Sin horario fijo no hay contra qué medir el tiempo extra: sólo se separa lo que estuvo dentro, afuera y sin marca.');

    const titulo = <TituloConAyuda titulo={textoTitulo} ayuda={ayuda} />;

    if (!loading && dias.length === 0) {
        return <Card title={titulo} size="small"><Empty description="Sin datos en el periodo" /></Card>;
    }

    const paso = Math.ceil(dias.length / 12);
    const tardeMax = Math.max(0, ...dias.map((d) => d.tarde ?? 0));
    const altoTarde = tardeMax > 0 ? Math.min(ALTO_TARDE_MAX, Math.max(12, (tardeMax / maximo) * ALTO)) : 0;
    const base = 30 + altoTarde;
    const referencia = (JORNADA_ESPERADA_MIN / maximo) * 100;

    return (
        <Card title={titulo} size="small" loading={loading}>
            <Leyenda />
            <div style={{ position: 'relative', height: ALTO + base }}>
                <div style={{
                    position: 'absolute', left: 0, right: 0, bottom: base + ((referencia * ALTO) / 100),
                    borderTop: `1px dashed ${COLOR_REFERENCIA}`, pointerEvents: 'none',
                }}
                >
                    <span style={{ ...EJE_TEXTO, position: 'absolute', right: 0, top: -16 }}>8 h</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'stretch', gap: 3, height: '100%' }}>
                    {dias.map((d, i) => (
                        <Columna
                            key={d.dia}
                            d={d}
                            maximo={maximo}
                            etiqueta={i % paso === 0 ? d.dia.slice(5) : null}
                            altoTarde={altoTarde}
                            horaEntrada={horario?.entrada}
                        />
                    ))}
                </div>
            </div>
        </Card>
    );
};

export default ChartJornadas;
