import { Card, Empty, Tooltip, Typography } from 'antd';

import TituloConAyuda from '@shared/components/TituloConAyuda';
import { COLOR_ENTRADA, COLOR_SALIDA } from '@features/vine/constants';
import {
    COLOR_REFERENCIA, COLOR_TINTA, aMinutos, formatoMinutos,
} from '@features/vine/constants/jornada';

const { Text } = Typography;

const ANCHO = 520;
const ALTO = 230;
const M = { izq: 44, der: 16, arriba: 12, abajo: 46 };
const TEXTO = { fontSize: 11, fill: COLOR_TINTA };

const SERIES = [
    { clave: 'entrada_mediana', nombre: 'Entrada mediana', color: COLOR_ENTRADA },
    { clave: 'salida_mediana', nombre: 'Salida mediana', color: COLOR_SALIDA },
];

const hora = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

const porcentaje = (d) => (d.habiles ? Math.min(100, Math.round((d.dias * 100) / d.habiles)) : null);

const detalle = (d) => {
    const pct = porcentaje(d);
    return [
        `${d.nombre}: vino ${d.dias}${d.habiles ? ` de ${d.habiles} hábiles (${pct}%)` : ''}`,
        `Entra ${d.entrada_mediana ?? '—'} · sale ${d.salida_mediana ?? '—'}`,
        d.afuera_promedio != null && `Afuera en promedio ${formatoMinutos(d.afuera_promedio)}`,
        d.dias > 0 && `Retardos ${Math.round((d.retardos * 100) / d.dias)}%`,
        d.dias > 0 && `Jornadas sin cerrar ${Math.round((d.sin_cerrar * 100) / d.dias)}%`,
    ].filter(Boolean).map((l) => <div key={l}>{l}</div>);
};

const Leyenda = () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginBottom: 8 }}>
        {SERIES.map((s) => (
            <span key={s.clave} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 14, height: 2, background: s.color, display: 'inline-block' }} />
                <Text style={{ fontSize: 12 }}>{s.nombre}</Text>
            </span>
        ))}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, borderTop: `1px dashed ${COLOR_REFERENCIA}`, display: 'inline-block' }} />
            <Text style={{ fontSize: 12 }}>Horario oficial</Text>
        </span>
    </div>
);

const ChartSemana = ({ semana = [], horario, loading }) => {
    const titulo = (
        <TituloConAyuda
            titulo="A qué días viene"
            ayuda="Por día de la semana: a qué hora suele entrar y salir, y qué porcentaje de esos días hábiles vino. La franja es su jornada típica. Pasa el cursor para ver tiempo afuera, retardos y jornadas sin cerrar."
        />
    );

    const oficiales = [horario?.entrada, horario?.salida].map(aMinutos).filter((v) => v != null);
    const valores = semana.flatMap((d) => SERIES.map((s) => aMinutos(d[s.clave]))).filter((v) => v != null);

    if (!loading && valores.length === 0) {
        return <Card title={titulo} size="small"><Empty description="Sin datos en el periodo" /></Card>;
    }

    const minimo = Math.floor((Math.min(...valores, ...oficiales) - 30) / 60) * 60;
    const maximo = Math.ceil((Math.max(...valores, ...oficiales) + 30) / 60) * 60;
    const alto = ALTO - M.arriba - M.abajo;
    const ancho = ANCHO - M.izq - M.der;
    const y = (m) => M.arriba + alto - (((m - minimo) / Math.max(1, maximo - minimo)) * alto);
    const columna = ancho / Math.max(1, semana.length);
    const x = (i) => M.izq + (columna * (i + 0.5));

    const puntos = (clave) => semana
        .map((d, i) => (aMinutos(d[clave]) != null ? [x(i), y(aMinutos(d[clave]))] : null))
        .filter(Boolean);
    const entradas = puntos('entrada_mediana');
    const salidas = puntos('salida_mediana');
    const franja = [...entradas, ...[...salidas].reverse()].map((p) => p.join(',')).join(' ');
    const marcas = [];
    for (let m = minimo; m <= maximo; m += 60) marcas.push(m);

    return (
        <Card title={titulo} size="small" loading={loading}>
            <Leyenda />
            <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} width="100%" role="img" aria-label="Entrada y salida mediana por día de la semana">
                {marcas.map((m) => (
                    <g key={m}>
                        <line x1={M.izq} x2={ANCHO - M.der} y1={y(m)} y2={y(m)} stroke="rgba(0,0,0,0.06)" />
                        <text x={M.izq - 6} y={y(m) + 4} textAnchor="end" style={TEXTO}>{hora(m)}</text>
                    </g>
                ))}
                {oficiales.map((m) => (
                    <line key={`o${m}`} x1={M.izq} x2={ANCHO - M.der} y1={y(m)} y2={y(m)} stroke={COLOR_REFERENCIA} strokeDasharray="4 4" />
                ))}
                {entradas.length > 1 && salidas.length === entradas.length && (
                    <polygon points={franja} fill={COLOR_ENTRADA} fillOpacity={0.1} />
                )}
                {SERIES.map((s) => {
                    const p = puntos(s.clave);
                    return (
                        <g key={s.clave}>
                            <polyline points={p.map((q) => q.join(',')).join(' ')} fill="none" stroke={s.color} strokeWidth={2} />
                            {p.map(([cx, cy]) => (
                                <circle key={`${cx}`} cx={cx} cy={cy} r={4} fill={s.color} stroke="#fff" strokeWidth={2} />
                            ))}
                        </g>
                    );
                })}
                {semana.map((d, i) => (
                    <g key={d.dia_semana}>
                        <text x={x(i)} y={ALTO - M.abajo + 18} textAnchor="middle" style={TEXTO}>{d.nombre.slice(0, 3)}</text>
                        <text x={x(i)} y={ALTO - M.abajo + 34} textAnchor="middle" style={{ ...TEXTO, fontWeight: 600 }}>
                            {porcentaje(d) != null ? `${porcentaje(d)}%` : `${d.dias} d`}
                        </text>
                        <Tooltip title={detalle(d)}>
                            <rect x={x(i) - (columna / 2)} y={0} width={columna} height={ALTO} fill="transparent" />
                        </Tooltip>
                    </g>
                ))}
            </svg>
        </Card>
    );
};

export default ChartSemana;
