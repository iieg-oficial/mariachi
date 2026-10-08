import { Card, Empty, Tooltip } from 'antd';

import TituloConAyuda from '@shared/components/TituloConAyuda';
import { COLOR_NEUTRO } from '@features/vine/constants';
import { COLOR_TINTA } from '@features/vine/constants/jornada';

const ANCHO = 900;
const ALTO = 220;
const M = { izq: 48, der: 16, arriba: 16, abajo: 40 };
const TEXTO = { fontSize: 11, fill: COLOR_TINTA };

const redondo = (valor) => {
    const potencia = 10 ** Math.max(0, Math.floor(Math.log10(Math.max(1, valor))));
    return Math.ceil(valor / potencia) * potencia;
};

const ChartLinea = ({
    title, ayuda, datos = [], loading, color = COLOR_NEUTRO, detalle, marca,
}) => {
    const titulo = <TituloConAyuda titulo={title} ayuda={ayuda} />;

    if (!loading && datos.length === 0) {
        return <Card title={titulo} size="small"><Empty description="Sin datos en el periodo" /></Card>;
    }

    const tope = redondo(Math.max(1, ...datos.map((d) => d.valor ?? 0)));
    const alto = ALTO - M.arriba - M.abajo;
    const columna = (ANCHO - M.izq - M.der) / Math.max(1, datos.length);
    const x = (i) => M.izq + (columna * (i + 0.5));
    const y = (v) => M.arriba + alto - ((v / tope) * alto);
    const paso = Math.ceil(datos.length / 12);
    const guias = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(tope * f));
    const puntos = datos.map((d, i) => `${x(i)},${y(d.valor ?? 0)}`).join(' ');

    return (
        <Card title={titulo} size="small" loading={loading}>
            <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} width="100%" role="img" aria-label={title}>
                {guias.map((g) => (
                    <g key={g}>
                        <line
                            x1={M.izq}
                            x2={ANCHO - M.der}
                            y1={y(g)}
                            y2={y(g)}
                            stroke="rgba(0,0,0,0.06)"
                            vectorEffect="non-scaling-stroke"
                        />
                        <text x={M.izq - 6} y={y(g) + 4} textAnchor="end" style={TEXTO}>
                            {g.toLocaleString('es-MX')}
                        </text>
                    </g>
                ))}
                <polyline points={puntos} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
                {datos.map((d, i) => (
                    <g key={d.etiqueta}>
                        <circle cx={x(i)} cy={y(d.valor ?? 0)} r={4} fill={color} stroke="#fff" strokeWidth={2} />
                        {i % paso === 0 && (
                            <text x={x(i)} y={ALTO - M.abajo + 18} textAnchor="middle" style={TEXTO}>{d.etiqueta}</text>
                        )}
                        {marca?.(d) && (
                            <text x={x(i)} y={ALTO - M.abajo + 34} textAnchor="middle" style={TEXTO}>{marca(d)}</text>
                        )}
                        <Tooltip title={detalle ? detalle(d) : `${d.etiqueta} · ${(d.valor ?? 0).toLocaleString('es-MX')}`}>
                            <rect x={x(i) - (columna / 2)} y={0} width={columna} height={ALTO} fill="transparent" />
                        </Tooltip>
                    </g>
                ))}
            </svg>
        </Card>
    );
};

export default ChartLinea;
