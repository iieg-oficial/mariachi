import { Empty, Space, Tag, Typography } from 'antd';

const { Text } = Typography;

const filas = (config) => {
    if (!config || typeof config !== 'object') return [];
    const out = [];
    if (config.headerField) out.push({ zona: 'Título', field: config.headerField, label: null });
    (config.cards || []).forEach((c) => out.push({ zona: 'Cifras', field: c.field, label: c.label }));
    (config.list || []).forEach((r) => out.push({ zona: 'Detalles', field: r.field, label: r.label }));
    (config.text || []).forEach((b) => (b.items || []).forEach((i) => out.push({
        zona: 'Texto', field: i.field, label: i.label,
    })));
    return out;
};

const clave = (fila) => `${fila.zona}|${fila.field}`;

const Fila = ({ fila, estado }) => {
    const color = estado === 'agregado' ? 'green' : (estado === 'quitado' ? 'red' : 'orange');
    return (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '2px 0' }}>
            <Tag color={color} style={{ minWidth: 74, textAlign: 'center', margin: 0 }}>{fila.zona}</Tag>
            <Text code>{fila.field}</Text>
            {fila.label && <Text type="secondary">→ {fila.label}</Text>}
        </div>
    );
};

export default function ConfigDiff({ vigente, propuesta }) {
    const antes = filas(vigente);
    const despues = filas(propuesta);
    const antesKeys = new Set(antes.map(clave));
    const despuesKeys = new Set(despues.map(clave));

    const agregados = despues.filter((f) => !antesKeys.has(clave(f)));
    const quitados = antes.filter((f) => !despuesKeys.has(clave(f)));
    const renombrados = despues.filter((f) => {
        const previo = antes.find((a) => clave(a) === clave(f));
        return previo && previo.label !== f.label;
    });

    if (!agregados.length && !quitados.length && !renombrados.length) {
        return <Empty description="La propuesta no cambia nada respecto a lo vigente" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }

    return (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {agregados.length > 0 && (
                <div>
                    <Text strong style={{ color: '#1E7A4C' }}>Agrega</Text>
                    {agregados.map((f) => <Fila key={`a-${clave(f)}`} fila={f} estado="agregado" />)}
                </div>
            )}
            {quitados.length > 0 && (
                <div>
                    <Text strong style={{ color: '#B03A46' }}>Quita</Text>
                    {quitados.map((f) => <Fila key={`q-${clave(f)}`} fila={f} estado="quitado" />)}
                </div>
            )}
            {renombrados.length > 0 && (
                <div>
                    <Text strong style={{ color: '#A96A08' }}>Renombra</Text>
                    {renombrados.map((f) => <Fila key={`r-${clave(f)}`} fila={f} estado="renombrado" />)}
                </div>
            )}
        </Space>
    );
}
