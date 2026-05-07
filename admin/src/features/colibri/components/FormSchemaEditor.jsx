import { useMemo } from 'react';
import {
    Alert,
    Button,
    Card,
    Empty,
    Input,
    Select,
    Space,
    Switch,
    Tag,
    Typography,
} from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';

const { Text } = Typography;

const FIELD_TYPES = [
    { value: 'text', label: 'Texto corto' },
    { value: 'textarea', label: 'Texto largo' },
    { value: 'email', label: 'Email' },
    { value: 'url', label: 'URL' },
    { value: 'number', label: 'Número' },
    { value: 'select', label: 'Lista (uno)' },
    { value: 'multiselect', label: 'Lista (varios)' },
    { value: 'radio', label: 'Radio' },
    { value: 'checkbox', label: 'Casilla sí/no' },
    { value: 'file', label: 'Archivo' },
    { value: 'direccion', label: 'Dirección IIEG' },
];

const TYPES_WITH_OPTIONS = new Set(['select', 'multiselect', 'radio']);

function slugifyKey(value) {
    return (value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9_]+/g, '_')
        .replace(/^[^a-z]+/, '')
        .replace(/^_+|_+$/g, '')
        .slice(0, 50);
}

function cloneCampos(campos) {
    return Array.isArray(campos) ? campos.map((c) => ({ ...c, options: c.options ? c.options.map((o) => ({ ...o })) : undefined })) : [];
}


export default function FormSchemaEditor({ value, onChange }) {
    const campos = useMemo(() => cloneCampos(value?.campos), [value]);

    const update = (next) => {
        onChange({ campos: next });
    };

    const handleAdd = () => {
        const nextIndex = campos.length + 1;
        update([
            ...campos,
            {
                key: `campo_${nextIndex}`,
                label: `Campo ${nextIndex}`,
                type: 'text',
                required: false,
            },
        ]);
    };

    const handleField = (idx, patch) => {
        const next = [...campos];
        next[idx] = { ...next[idx], ...patch };
        if (patch.type) {
            if (TYPES_WITH_OPTIONS.has(patch.type) && !next[idx].options) {
                next[idx].options = [{ value: 'opcion_1', label: 'Opción 1' }];
            }
            if (!TYPES_WITH_OPTIONS.has(patch.type)) {
                next[idx].options = undefined;
            }
        }
        update(next);
    };

    const handleLabelChange = (idx, label) => {
        const next = [...campos];
        const wasAuto = !next[idx].key || next[idx].key === slugifyKey(next[idx].label || '');
        next[idx] = { ...next[idx], label };
        if (wasAuto) {
            next[idx].key = slugifyKey(label) || `campo_${idx + 1}`;
        }
        update(next);
    };

    const handleRemove = (idx) => {
        update(campos.filter((_, i) => i !== idx));
    };

    const handleMove = (idx, delta) => {
        const target = idx + delta;
        if (target < 0 || target >= campos.length) return;
        const next = [...campos];
        [next[idx], next[target]] = [next[target], next[idx]];
        update(next);
    };

    const handleOption = (fieldIdx, optionIdx, patch) => {
        const next = [...campos];
        const options = [...(next[fieldIdx].options || [])];
        options[optionIdx] = { ...options[optionIdx], ...patch };
        next[fieldIdx] = { ...next[fieldIdx], options };
        update(next);
    };

    const handleAddOption = (fieldIdx) => {
        const next = [...campos];
        const options = [...(next[fieldIdx].options || [])];
        const n = options.length + 1;
        options.push({ value: `opcion_${n}`, label: `Opción ${n}` });
        next[fieldIdx] = { ...next[fieldIdx], options };
        update(next);
    };

    const handleRemoveOption = (fieldIdx, optionIdx) => {
        const next = [...campos];
        const options = (next[fieldIdx].options || []).filter((_, i) => i !== optionIdx);
        next[fieldIdx] = { ...next[fieldIdx], options };
        update(next);
    };

    const duplicateKeys = useMemo(() => {
        const counts = new Map();
        for (const c of campos) {
            counts.set(c.key, (counts.get(c.key) || 0) + 1);
        }
        return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([k]) => k));
    }, [campos]);

    return (
        <div>
            <Alert
                type="info"
                showIcon
                closable
                style={{ marginBottom: 12 }}
                message="Estos campos se mostrarán en el formulario público cuando el usuario seleccione este tipo de reporte."
                description="Los campos `mensaje` y `email_contacto` ya están en el formulario base, no necesitas declararlos aquí."
            />

            {campos.length === 0 ? (
                <Empty description="Sin campos personalizados (solo se pedirá mensaje + email)" />
            ) : (
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    {campos.map((campo, idx) => (
                        <Card key={idx} size="small">
                            <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
                                <Space size={4}>
                                    <Tag>{idx + 1}</Tag>
                                    <Text type="secondary" style={{ fontSize: 12 }}>{FIELD_TYPES.find((t) => t.value === campo.type)?.label}</Text>
                                    {duplicateKeys.has(campo.key) && (
                                        <Tag color="red">key duplicada</Tag>
                                    )}
                                </Space>
                                <Space size={4}>
                                    <Button size="small" icon={<ArrowUpOutlined />} disabled={idx === 0} onClick={() => handleMove(idx, -1)} />
                                    <Button size="small" icon={<ArrowDownOutlined />} disabled={idx === campos.length - 1} onClick={() => handleMove(idx, 1)} />
                                    <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleRemove(idx)} />
                                </Space>
                            </Space>

                            <Space direction="vertical" size={6} style={{ width: '100%' }}>
                                <Input
                                    placeholder="Etiqueta visible"
                                    value={campo.label}
                                    onChange={(e) => handleLabelChange(idx, e.target.value)}
                                />
                                <Space.Compact style={{ width: '100%' }}>
                                    <Input
                                        addonBefore="key"
                                        value={campo.key}
                                        onChange={(e) => handleField(idx, { key: slugifyKey(e.target.value) })}
                                        placeholder="campo_1"
                                    />
                                    <Select
                                        value={campo.type}
                                        onChange={(type) => handleField(idx, { type })}
                                        options={FIELD_TYPES}
                                        style={{ width: 180 }}
                                    />
                                </Space.Compact>
                                <Input
                                    placeholder="Placeholder"
                                    value={campo.placeholder || ''}
                                    onChange={(e) => handleField(idx, { placeholder: e.target.value || undefined })}
                                />
                                <Input
                                    placeholder="Texto de ayuda (opcional)"
                                    value={campo.helpText || ''}
                                    onChange={(e) => handleField(idx, { helpText: e.target.value || undefined })}
                                />
                                <Space>
                                    <Switch
                                        checked={campo.required}
                                        onChange={(checked) => handleField(idx, { required: checked })}
                                    />
                                    <Text>Requerido</Text>
                                </Space>

                                {TYPES_WITH_OPTIONS.has(campo.type) && (
                                    <div style={{ background: '#fafafa', padding: 8, borderRadius: 4 }}>
                                        <Text strong style={{ fontSize: 12 }}>Opciones</Text>
                                        <Space direction="vertical" size={4} style={{ width: '100%', marginTop: 6 }}>
                                            {(campo.options || []).map((opt, optIdx) => (
                                                <Space.Compact key={optIdx} style={{ width: '100%' }}>
                                                    <Input
                                                        addonBefore="value"
                                                        value={opt.value}
                                                        onChange={(e) => handleOption(idx, optIdx, { value: slugifyKey(e.target.value) })}
                                                        style={{ width: 160 }}
                                                    />
                                                    <Input
                                                        addonBefore="label"
                                                        value={opt.label}
                                                        onChange={(e) => handleOption(idx, optIdx, { label: e.target.value })}
                                                    />
                                                    <Button danger icon={<DeleteOutlined />} onClick={() => handleRemoveOption(idx, optIdx)} />
                                                </Space.Compact>
                                            ))}
                                            <Button size="small" icon={<PlusOutlined />} onClick={() => handleAddOption(idx)}>
                                                Opción
                                            </Button>
                                        </Space>
                                    </div>
                                )}
                            </Space>
                        </Card>
                    ))}
                </Space>
            )}

            <Button
                type="dashed"
                block
                icon={<PlusOutlined />}
                onClick={handleAdd}
                style={{ marginTop: 12 }}
            >
                Agregar campo
            </Button>
        </div>
    );
}
