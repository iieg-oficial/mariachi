import { Progress, Space, Typography } from 'antd';
import { gradoDe, tono } from '@shared/components/nodos/nodoUtils';

const { Text } = Typography;

export const TituloSeccion = ({ texto, conteo }) => (
    <Space size={8} align="center" style={{ marginBottom: 8 }}>
        <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {texto}
        </Text>
        {conteo && (
            <Text style={{
                fontSize: 11,
                fontFamily: 'monospace',
                padding: '0 7px',
                borderRadius: 9,
                background: '#f5f5f5',
                color: 'rgba(0,0,0,0.65)',
            }}>
                {conteo}
            </Text>
        )}
    </Space>
);

export const CifraTemperatura = ({ nombre, grados }) => {
    const tramo = gradoDe(grados);
    return (
        <div>
            <Text style={{
                display: 'block',
                fontSize: 26,
                fontWeight: 600,
                lineHeight: 1.1,
                color: tramo.color,
                fontVariantNumeric: 'tabular-nums',
            }}>
                {`${grados}°`}
            </Text>
            <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {nombre}
            </Text>
            <Text style={{ display: 'block', fontSize: 10, color: tramo.color }}>
                {tramo.texto}
            </Text>
        </div>
    );
};

export const Medidor = ({ llave, etiqueta, valor, absoluto, nota }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 116px', gap: 8, alignItems: 'center' }}>
        <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase' }}>{etiqueta}</Text>
        <Progress
            percent={valor ?? 0}
            showInfo={false}
            size="small"
            strokeColor={tono(llave, valor)}
            railColor="#f5f5f5"
        />
        <div style={{ textAlign: 'right' }}>
            <Text type="secondary" style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
                {absoluto}
            </Text>
            {nota && (
                <Text type="secondary" style={{ display: 'block', fontSize: 10, opacity: 0.75 }}>
                    {nota}
                </Text>
            )}
        </div>
    </div>
);

const intensidadCore = (uso) => {
    if (uso >= 80) return 1;
    if (uso >= 50) return 0.75;
    if (uso >= 20) return 0.5;
    if (uso >= 5) return 0.28;
    return 0.12;
};

export const RejillaCores = ({ cores }) => (
    <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(cores.length, 10)}, 1fr)`,
        gap: 3,
    }}>
        {cores.map(({ core, uso }) => (
            <div
                key={core}
                style={{
                    height: 14,
                    borderRadius: 3,
                    background: tono('cpu', uso),
                    opacity: intensidadCore(uso),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                }}
            >
                <span style={{
                    fontSize: 8,
                    lineHeight: 1,
                    fontFamily: 'monospace',
                    whiteSpace: 'nowrap',
                    color: uso >= 50 ? '#fff' : 'rgba(0,0,0,0.75)',
                }}>
                    {`${core}·${uso}%`}
                </span>
            </div>
        ))}
    </div>
);

export const MedidorMemoria = ({ usado, cache, total, libre }) => {
    const pct = (valor) => (total ? Math.max(0, Math.min(100, (valor / total) * 100)) : 0);
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 116px', gap: 8, alignItems: 'center' }}>
            <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase' }}>RAM</Text>
            <div style={{
                display: 'flex',
                height: 6,
                borderRadius: 3,
                overflow: 'hidden',
                background: '#f5f5f5',
            }}>
                <div style={{ width: `${pct(usado)}%`, background: tono('ram', pct(usado)) }} />
                <div style={{ width: `${pct(cache)}%`, background: tono('ram', pct(usado)), opacity: 0.3 }} />
            </div>
            <div style={{ textAlign: 'right' }}>
                <Text type="secondary" style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
                    {`${libre.toFixed(1)} / ${total} GB`}
                </Text>
                <Text type="secondary" style={{ display: 'block', fontSize: 10, opacity: 0.75 }}>
                    {`${cache} GB caché`}
                </Text>
            </div>
        </div>
    );
};
