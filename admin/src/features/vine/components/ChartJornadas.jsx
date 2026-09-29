import { Card, Empty, Tooltip, Typography } from 'antd';
import { useMemo } from 'react';

import TituloConAyuda from '@shared/components/TituloConAyuda';
import { EJE_TEXTO } from '@features/vine/constants';
import {
    COLOR_REFERENCIA, COLOR_TINTA, JORNADA_ESPERADA_MIN, SEGMENTOS_JORNADA, TEXTURA_SIN_MARCA, formatoMinutos,
} from '@features/vine/constants/jornada';

const { Text } = Typography;

const ALTO = 180;

const ESTADOS = {
    inhabil: { glifo: '✕', texto: 'Inhábil' },
    incidencia: { glifo: '◆', texto: 'Incidencia' },
};

const fondo = (s) => (s.textura
    ? { backgroundImage: TEXTURA_SIN_MARCA, boxShadow: `inset 0 0 0 1px ${s.color}` }
    : { background: s.color });

const Leyenda = () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginBottom: 12 }}>
        {SEGMENTOS_JORNADA.map((s) => (
            <span key={s.clave} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, display: 'inline-block', ...fondo(s) }} />
                <Text style={{ fontSize: 12 }}>{s.nombre}</Text>
            </span>
        ))}
        <Text style={{ fontSize: 12 }}>● retardo</Text>
        <Text style={{ fontSize: 12 }}>○ no cerró</Text>
        <Text style={{ fontSize: 12 }}>◆ incidencia</Text>
        <Text style={{ fontSize: 12 }}>✕ inhábil</Text>
    </div>
);

const detalle = (d) => {
    if (d.estado !== 'asistio') {
        const motivo = d.incidencia?.nombre ?? ESTADOS[d.estado]?.texto ?? 'Sin registro';
        return `${d.dia} · ${motivo}`;
    }
    const lineas = [`${d.dia} · ${d.entrada ?? '—'} a ${d.salida ?? 'sin salida'}`];
    if (!d.cerro) lineas.push('La jornada no cerró: no hay salida que medir');
    SEGMENTOS_JORNADA.forEach((s) => {
        if (d[s.clave]) lineas.push(`${s.nombre}: ${formatoMinutos(d[s.clave])}`);
    });
    if (d.retardo) lineas.push('Llegó después de la tolerancia');
    if (d.incidencia) lineas.push(d.incidencia.nombre);
    return lineas.map((l) => <div key={l}>{l}</div>);
};

const Columna = ({ d, maximo, etiqueta }) => {
    const glifo = d.estado === 'asistio'
        ? (d.cerro ? (d.retardo ? '●' : '') : '○')
        : ESTADOS[d.estado]?.glifo ?? '';
    return (
        <Tooltip title={detalle(d)}>
            <div style={{ flex: '1 1 0', minWidth: 8, display: 'flex', flexDirection: 'column', height: '100%', cursor: 'default' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column-reverse', gap: 2 }}>
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

const ChartJornadas = ({ dias = [], horario, loading }) => {
    const maximo = useMemo(() => Math.max(
        JORNADA_ESPERADA_MIN * 1.25,
        ...dias.map((d) => SEGMENTOS_JORNADA.reduce((t, s) => t + (d[s.clave] ?? 0), 0)),
    ), [dias]);

    const ayuda = horario?.entrada
        ? `Una barra por día, partida contra su horario de ${horario.entrada} a ${horario.salida}. Afuera es el tiempo entre una salida y su regreso; sin marca, el hueco entre dos entradas o dos salidas seguidas, que no se puede atribuir. Retardo: más de ${horario.tolerancia} min tarde.`
        : 'Una barra por día. Sin horario fijo no hay contra qué medir el tiempo extra: sólo se separa lo que estuvo dentro, afuera y sin marca.';

    const titulo = <TituloConAyuda titulo="Cómo se repartió cada jornada" ayuda={ayuda} />;

    if (!loading && dias.length === 0) {
        return <Card title={titulo} size="small"><Empty description="Sin datos en el periodo" /></Card>;
    }

    const paso = Math.ceil(dias.length / 12);
    const referencia = (JORNADA_ESPERADA_MIN / maximo) * 100;

    return (
        <Card title={titulo} size="small" loading={loading}>
            <Leyenda />
            <div style={{ position: 'relative', height: ALTO + 30 }}>
                <div style={{
                    position: 'absolute', left: 0, right: 0, bottom: `calc(30px + ${(referencia * ALTO) / 100}px)`,
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
                        />
                    ))}
                </div>
            </div>
        </Card>
    );
};

export default ChartJornadas;
