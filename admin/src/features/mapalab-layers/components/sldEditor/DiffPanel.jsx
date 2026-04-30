import { useMemo } from 'react';
import { Empty, Space, Tag, Typography } from 'antd';

const { Text } = Typography;

const fmt = (v) => (v === null || v === undefined ? '∅' : String(v));

function diffArrays(prev, next, formatItem = fmt) {
    const max = Math.max(prev.length, next.length);
    const changes = [];
    for (let i = 0; i < max; i++) {
        const a = prev[i];
        const b = next[i];
        const aStr = formatItem(a);
        const bStr = formatItem(b);
        if (aStr !== bStr) {
            changes.push({ idx: i, prev: a, next: b });
        }
    }
    return changes;
}

function buildDiff(prev, next) {
    if (!prev || !next) return null;
    const out = [];

    if (prev.style_title !== next.style_title) {
        out.push({ kind: 'field', label: 'Título del estilo', prev: prev.style_title, next: next.style_title });
    }
    if (prev.attribute !== next.attribute) {
        out.push({ kind: 'field', label: 'Atributo', prev: prev.attribute, next: next.attribute });
    }
    if (prev.units !== next.units) {
        out.push({ kind: 'field', label: 'Unidades', prev: prev.units, next: next.units });
    }

    const cortesDiff = diffArrays(prev.cortes || [], next.cortes || []);
    if (cortesDiff.length) out.push({ kind: 'cortes', changes: cortesDiff });

    const labelsDiff = diffArrays(prev.labels || [], next.labels || []);
    if (labelsDiff.length) out.push({ kind: 'labels', changes: labelsDiff });

    const colorsDiff = diffArrays(prev.colors || [], next.colors || [], (c) => (c || '').toUpperCase());
    if (colorsDiff.length) out.push({ kind: 'colors', changes: colorsDiff });

    const prevStroke = JSON.stringify(prev.stroke || {});
    const nextStroke = JSON.stringify(next.stroke || {});
    if (prevStroke !== nextStroke) out.push({ kind: 'stroke', prev: prev.stroke, next: next.stroke });

    const prevNull = JSON.stringify(prev.null_style || null);
    const nextNull = JSON.stringify(next.null_style || null);
    if (prevNull !== nextNull) out.push({ kind: 'null_style', prev: prev.null_style, next: next.null_style });

    return out;
}

const ColorChip = ({ color }) => (
    <span
        style={{
            display: 'inline-block',
            width: 14,
            height: 14,
            background: color,
            border: '1px solid #d9d9d9',
            borderRadius: 2,
            verticalAlign: 'middle',
            marginRight: 4,
        }}
    />
);

export default function DiffPanel({ baseline, current }) {
    const diff = useMemo(() => buildDiff(baseline, current), [baseline, current]);

    if (!diff) return null;
    if (diff.length === 0) {
        return (
            <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={<Text type="secondary" style={{ fontSize: 12 }}>Sin cambios respecto al SLD actual de GeoServer</Text>}
            />
        );
    }

    return (
        <Space orientation="vertical" size={8} style={{ width: '100%' }}>
            {diff.map((d, i) => {
                if (d.kind === 'field') {
                    return (
                        <div key={i}>
                            <Text strong style={{ fontSize: 12 }}>{d.label}: </Text>
                            <Tag color="default" style={{ textDecoration: 'line-through' }}>{fmt(d.prev)}</Tag>
                            <Text>→</Text>
                            <Tag color="orange">{fmt(d.next)}</Tag>
                        </div>
                    );
                }
                if (d.kind === 'cortes' || d.kind === 'labels') {
                    const titleMap = { cortes: 'Cortes', labels: 'Etiquetas' };
                    return (
                        <div key={i}>
                            <Text strong style={{ fontSize: 12 }}>{titleMap[d.kind]}: </Text>
                            {d.changes.map((c, ci) => (
                                <div key={ci} style={{ marginLeft: 12, fontSize: 12 }}>
                                    <Text type="secondary">[{c.idx}]</Text>{' '}
                                    <Tag color="default" style={{ textDecoration: 'line-through' }}>{fmt(c.prev)}</Tag>
                                    →{' '}
                                    <Tag color="orange">{fmt(c.next)}</Tag>
                                </div>
                            ))}
                        </div>
                    );
                }
                if (d.kind === 'colors') {
                    return (
                        <div key={i}>
                            <Text strong style={{ fontSize: 12 }}>Colores: </Text>
                            {d.changes.map((c, ci) => (
                                <div key={ci} style={{ marginLeft: 12, fontSize: 12 }}>
                                    <Text type="secondary">[c{c.idx + 1}]</Text>{' '}
                                    <ColorChip color={c.prev} /><Text code style={{ fontSize: 11 }}>{c.prev}</Text>
                                    {' → '}
                                    <ColorChip color={c.next} /><Text code style={{ fontSize: 11 }}>{c.next}</Text>
                                </div>
                            ))}
                        </div>
                    );
                }
                if (d.kind === 'stroke') {
                    return (
                        <div key={i}>
                            <Text strong style={{ fontSize: 12 }}>Borde modificado</Text>
                            <pre style={{ fontSize: 11, margin: 0, marginLeft: 12 }}>
                                {JSON.stringify(d.next, null, 2)}
                            </pre>
                        </div>
                    );
                }
                if (d.kind === 'null_style') {
                    const wasEnabled = d.prev?.enabled !== false;
                    const isEnabled = d.next?.enabled !== false;
                    return (
                        <div key={i}>
                            <Text strong style={{ fontSize: 12 }}>Regla de valor nulo: </Text>
                            {wasEnabled !== isEnabled ? (
                                <Tag color={isEnabled ? 'green' : 'red'}>
                                    {isEnabled ? 'activada' : 'desactivada'}
                                </Tag>
                            ) : (
                                <Tag color="orange">propiedades modificadas</Tag>
                            )}
                        </div>
                    );
                }
                return null;
            })}
        </Space>
    );
}
