import { Tooltip, Typography } from 'antd';
import { SEMANTIC } from '@app/providers/brand';
import { porcentaje } from '@features/mapalab-api-keys/hooks/usoHelpers';

const { Text } = Typography;

const TRAMOS = [
    { campo: 'buenas', etiqueta: 'Buena', color: SEMANTIC.success },
    { campo: 'regulares', etiqueta: 'Regular', color: '#E8A33D' },
    { campo: 'malas', etiqueta: 'Mala', color: SEMANTIC.danger },
];

const formatoPromedio = (metrica, vital) => {
    if (!vital.muestras) return '—';
    const promedio = vital.suma / vital.muestras;
    if (metrica === 'CLS') return promedio.toFixed(3);
    return `${Math.round(promedio).toLocaleString('es-MX')} ms`;
};


export default function BarraCalidad({ metrica, vital, umbral }) {
    const total = vital ? vital.buenas + vital.regulares + vital.malas : 0;
    if (!total) return <Text type="secondary">—</Text>;

    const detalle = (
        <div style={{ fontSize: 12 }}>
            <div>{`${metrica} · ${total.toLocaleString('es-MX')} muestras · promedio ${formatoPromedio(metrica, vital)}`}</div>
            {TRAMOS.map((t) => (
                <div key={t.campo}>{`${t.etiqueta}: ${porcentaje(vital[t.campo], total)}% (${vital[t.campo]})`}</div>
            ))}
            {umbral && <div style={{ opacity: 0.75, marginTop: 4 }}>{umbral}</div>}
        </div>
    );

    return (
        <Tooltip title={detalle}>
            <div
                role="img"
                aria-label={`${metrica}: ${porcentaje(vital.buenas, total)}% buena`}
                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'help' }}
            >
                <div style={{ display: 'flex', flex: 1, height: 10, borderRadius: 5, overflow: 'hidden', minWidth: 60 }}>
                    {TRAMOS.map((t) => (
                        <div
                            key={t.campo}
                            style={{ width: `${(vital[t.campo] / total) * 100}%`, background: t.color }}
                        />
                    ))}
                </div>
                <Text style={{ fontSize: 11, minWidth: 32, textAlign: 'right' }}>
                    {`${porcentaje(vital.buenas, total)}%`}
                </Text>
            </div>
        </Tooltip>
    );
}
