import { Card, Empty, Tooltip } from 'antd';
import { useMemo } from 'react';

import TituloConAyuda from '@shared/components/TituloConAyuda';
import { EJE_TEXTO } from '@features/vine/constants';
import {
    COLOR_REFERENCIA, COLOR_TINTA, JORNADA_ESPERADA_MIN, SEGMENTOS_JORNADA,
} from '@features/vine/constants/jornada';
import {
    MINIMO, TARDE, detalle, fondo, glifoDe,
} from '@features/vine/components/jornada/piezas';
import Leyenda from '@features/vine/components/jornada/Leyenda';

const ALTO = 180;
const ALTO_TARDE_MAX = 48;

const Columna = ({ d, maximo, etiqueta, altoTarde, horaEntrada }) => {
    const glifo = glifoDe(d);
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
