import { Empty, Space, Tag, Typography } from 'antd';

const { Text } = Typography;

const partes = (compose) => (Array.isArray(compose) ? compose : [])
    .map((p) => (typeof p === 'string' ? p : p?.field))
    .filter(Boolean);

const origen = (def) => {
    if (!def) return null;
    if (typeof def === 'string') return def;
    if (def.field) return def.field;
    const campos = partes(def.compose);
    return campos.length ? campos.join(' + ') : null;
};

const itemsDeTexto = (text) => {
    if (!Array.isArray(text)) return [];
    if (text[0] && Array.isArray(text[0].items)) return text.flatMap((b) => b.items || []);
    return text;
};

const filas = (config) => {
    if (!config || typeof config !== 'object') return [];
    const out = [];
    if (config.headerField) out.push({ zona: 'Título', campo: origen(config.headerField), label: null });
    (config.cards || []).forEach((c) => out.push({ zona: 'Cifras', campo: origen(c), label: c.label }));
    (config.list || []).forEach((r) => out.push({ zona: 'Detalles', campo: origen(r), label: r.label }));
    itemsDeTexto(config.text).forEach((i) => out.push({ zona: 'Texto', campo: origen(i) || 'texto fijo', label: i.label }));
    return out;
};

const textosLibres = (config) => {
    if (!config || typeof config !== 'object') return [];
    const out = [];
    const afijos = (def) => {
        if (!def || typeof def !== 'object') return;
        if (def.sep) out.push(def.sep);
        (def.compose || []).forEach((p) => {
            if (p && typeof p === 'object') out.push(p.prefix, p.suffix);
        });
    };
    if (typeof config.headerField === 'string') out.push(config.headerField);
    else afijos(config.headerField);
    [...(config.cards || []), ...(config.list || []), ...itemsDeTexto(config.text)].forEach((item) => {
        out.push(item?.label, item?.suffix);
        afijos(item);
    });
    return out.filter((t) => typeof t === 'string' && t.trim());
};

const clave = (fila) => `${fila.zona}|${fila.campo}`;

const Fila = ({ fila, estado }) => {
    const color = estado === 'agregado' ? 'green' : (estado === 'quitado' ? 'red' : 'orange');
    return (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '2px 0' }}>
            <Tag color={color} style={{ minWidth: 74, textAlign: 'center', margin: 0 }}>{fila.zona}</Tag>
            <Text code>{fila.campo}</Text>
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
    const textosVigentes = new Set(textosLibres(vigente));
    const textosNuevos = [...new Set(textosLibres(propuesta))].filter((t) => !textosVigentes.has(t));

    if (!agregados.length && !quitados.length && !renombrados.length && !textosNuevos.length) {
        return <Empty description="La propuesta no cambia nada respecto a lo vigente" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }

    return (
        <Space orientation="vertical" size={12} style={{ width: '100%' }}>
            {textosNuevos.length > 0 && (
                <div>
                    <Text strong style={{ color: '#A96A08' }}>Texto escrito a mano</Text>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                        {textosNuevos.map((t) => <Tag key={t} color="orange" style={{ margin: 0, whiteSpace: 'normal' }}>{t}</Tag>)}
                    </div>
                </div>
            )}
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
