import { useEffect, useRef, useState } from 'react';
import { Button, Input, Space, Spin, Tag, Typography } from 'antd';
import {
    cutsForDisplay,
    cutsForEditing,
    hasZeroClass,
} from '@features/sextante/utils/stylesBatchTable';

const { Text } = Typography;

const MONO = { fontSize: 12, fontFamily: 'monospace', insetInlineStart: 0 };
const EDITABLE = { insetInlineStart: 0 };

export function CutsCell({ row, onChange }) {
    const [editing, setEditing] = useState(false);
    const inputRef = useRef(null);
    useEffect(() => {
        if (editing) inputRef.current?.focus();
    }, [editing]);
    if (editing) {
        const initial = cutsForEditing(row.cortes_texto);
        return (
            <Input
                id={`cortes-${row.fila}`}
                ref={inputRef}
                defaultValue={initial}
                style={{ width: 260, fontFamily: 'monospace' }}
                aria-label="Cortes"
                onPressEnter={(e) => e.currentTarget.blur()}
                onBlur={(e) => {
                    setEditing(false);
                    if (e.target.value !== initial) onChange(e.target.value);
                }}
            />
        );
    }
    const zero = hasZeroClass(row.cortes_texto);
    return (
        <Button type="text" size="small" onClick={() => setEditing(true)} aria-label="Editar cortes" style={{ height: 'auto' }}>
            <Space size={4} wrap>
                {cutsForDisplay(row.cortes_texto).map((cut, index) => (
                    <Tag key={`${cut}-${index}`} color={zero && index === 0 ? 'blue' : undefined} style={{ marginInlineEnd: 0 }}>
                        {cut}
                    </Tag>
                ))}
            </Space>
        </Button>
    );
}

export function LayerCell({ row, onChange }) {
    const layer = `${row.workspace}:${row.layer_name}`;
    return (
        <Space orientation="vertical" size={0}>
            <Text style={EDITABLE} editable={{ onChange: (nombre) => nombre !== row.nombre && onChange({ nombre }), tooltip: 'Editar nombre' }}>
                {row.nombre || '—'}
            </Text>
            <Text
                type="secondary"
                style={MONO}
                editable={{
                    tooltip: 'Cambiar capa (workspace:capa)',
                    onChange: (value) => {
                        const [workspace, ...rest] = value.trim().split(':');
                        if (value.trim() !== layer) onChange({ workspace, layer_name: rest.join(':') });
                    },
                }}
            >
                {layer}
            </Text>
            {row.style_name && row.style_name !== row.layer_name && (
                <Text type="secondary" style={MONO}>estilo {row.style_name}</Text>
            )}
        </Space>
    );
}

export function StatusCell({ row, checking }) {
    if (checking) return <Space size={6}><Spin size="small" /><Text type="secondary">Revisando</Text></Space>;
    if (row.errores.length) return <Text type="danger">{row.errores[0]}</Text>;
    return row.reemplaza ? <Tag color="warning">Reemplaza</Tag> : <Tag color="success">Nuevo</Tag>;
}
