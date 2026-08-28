import { Empty, Space, Typography } from 'antd';
import { BRAND, SEMANTIC } from '@app/providers/brand';

const { Text } = Typography;

const ANCHO = 640;
const ALTO = 150;
const MARGEN = { arriba: 8, derecha: 8, abajo: 18, izquierda: 30 };

const COLOR_SENSOR = {
    CPU: BRAND.purple,
    Sistema: BRAND.orange,
    Disco: SEMANTIC.success,
    Gráficos: BRAND.numeralia,
};

const colorDeSensor = (nombre) => COLOR_SENSOR[nombre] || SEMANTIC.neutral;

const hora = (iso) => new Date(iso).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
});

export default function GraficaTemperaturas({ series, cargando }) {
    if (cargando) {
        return <Text type="secondary" style={{ fontSize: 12 }}>Cargando historial…</Text>;
    }

    const conDatos = series.filter((s) => s.puntos.length > 1);
    if (!conDatos.length) {
        return (
            <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Aún no hay suficientes lecturas para dibujar la tendencia"
            />
        );
    }

    const momentos = conDatos.flatMap((s) => s.puntos.map((p) => new Date(p.momento).getTime()));
    const desde = Math.min(...momentos);
    const hasta = Math.max(...momentos);
    const grados = conDatos.flatMap((s) => s.puntos.map((p) => p.celsius));
    const minimo = Math.floor(Math.min(...grados) / 10) * 10;
    const maximo = Math.ceil(Math.max(...grados) / 10) * 10;
    const rango = maximo - minimo || 10;

    const x = (momento) => MARGEN.izquierda
        + ((new Date(momento).getTime() - desde) / (hasta - desde || 1))
        * (ANCHO - MARGEN.izquierda - MARGEN.derecha);
    const y = (celsius) => MARGEN.arriba
        + (1 - (celsius - minimo) / rango) * (ALTO - MARGEN.arriba - MARGEN.abajo);

    const marcas = [minimo, Math.round((minimo + maximo) / 2), maximo];

    return (
        <div>
            <svg
                viewBox={`0 0 ${ANCHO} ${ALTO}`}
                role="img"
                aria-label="Temperaturas de las últimas horas"
                style={{ display: 'block', width: '100%', height: 'auto' }}
            >
                {marcas.map((grado) => (
                    <g key={grado}>
                        <line
                            x1={MARGEN.izquierda} y1={y(grado)} x2={ANCHO - MARGEN.derecha} y2={y(grado)}
                            stroke="#f0f0f0" strokeWidth={1}
                        />
                        <text
                            x={MARGEN.izquierda - 6} y={y(grado) + 3} textAnchor="end"
                            fill="rgba(0,0,0,0.45)" style={{ fontSize: 9, fontFamily: 'monospace' }}
                        >
                            {grado}
                        </text>
                    </g>
                ))}

                {conDatos.map((serie) => (
                    <path
                        key={serie.nombre}
                        d={serie.puntos.map((punto, i) => (
                            `${i ? 'L' : 'M'} ${x(punto.momento).toFixed(1)} ${y(punto.celsius).toFixed(1)}`
                        )).join(' ')}
                        fill="none"
                        stroke={colorDeSensor(serie.nombre)}
                        strokeWidth={1.8}
                        strokeLinejoin="round"
                    />
                ))}

                <text
                    x={MARGEN.izquierda} y={ALTO - 4}
                    fill="rgba(0,0,0,0.45)" style={{ fontSize: 9, fontFamily: 'monospace' }}
                >
                    {hora(new Date(desde).toISOString())}
                </text>
                <text
                    x={ANCHO - MARGEN.derecha} y={ALTO - 4} textAnchor="end"
                    fill="rgba(0,0,0,0.45)" style={{ fontSize: 9, fontFamily: 'monospace' }}
                >
                    {hora(new Date(hasta).toISOString())}
                </text>
            </svg>

            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                marginTop: 6,
                width: '100%',
            }}>
                {conDatos.map((serie) => (
                    <Space key={serie.nombre} size={6}>
                        <span style={{
                            width: 14, height: 3, borderRadius: 2, display: 'block',
                            background: colorDeSensor(serie.nombre),
                        }} />
                        <Text type="secondary" style={{ fontSize: 11 }}>{serie.nombre}</Text>
                    </Space>
                ))}
            </div>
        </div>
    );
}
