import { Typography } from 'antd';

const { Text } = Typography;

function formatValue(value, campo) {
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (campo?.type === 'select' || campo?.type === 'radio') {
        const opt = campo.options?.find((o) => o.value === value);
        return opt ? opt.label : String(value);
    }
    return String(value);
}

export default function ReporteRespuestasPanel({ respuestas, tipoSchema }) {
    if (!respuestas || Object.keys(respuestas).length === 0) return null;
    const campos = tipoSchema?.campos || [];
    const camposByKey = Object.fromEntries(campos.map((c) => [c.key, c]));
    return (
        <div>
            <Text strong>Respuestas del formulario</Text>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(respuestas).map(([key, value]) => {
                    const campo = camposByKey[key];
                    const label = campo?.label || key;
                    return (
                        <div key={key}>
                            <Text type="secondary" style={{ fontSize: 12 }}>{label}</Text>
                            <div style={{ whiteSpace: 'pre-wrap' }}>{formatValue(value, campo)}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
