import { useEffect } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Select, Space } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { STEP_TYPES } from '../../constants/definitionTypes';

export default function StepDrawer({ open, step, onSave, onClose }) {
    const [form] = Form.useForm();

    useEffect(() => {
        if (!open) return;
        form.setFieldsValue({
            id: step?.id ?? '',
            type: step?.type ?? 'form',
            title: step?.title ?? '',
            icon: step?.icon ?? '',
            minItems: step?.minItems,
            maxItems: step?.maxItems,
            itemLabel: step?.itemLabel ?? '',
            tabs: step?.tabs ?? [],
            exportPdf: step?.exportPdf ?? false,
            incomplete_title: step?.incompleteNotice?.title ?? '',
            incomplete_message: step?.incompleteNotice?.message ?? '',
        });
    }, [open, step, form]);

    const watchType = Form.useWatch('type', form);

    const handleFinish = (values) => {
        const out = {
            id: values.id,
            type: values.type,
            title: values.title,
            ...(values.icon ? { icon: values.icon } : {}),
        };
        if (values.type === 'repeater') {
            if (values.minItems != null) out.minItems = values.minItems;
            if (values.maxItems != null) out.maxItems = values.maxItems;
            if (values.itemLabel) out.itemLabel = values.itemLabel;
            const tabs = (values.tabs ?? [])
                .map((t) => ({ id: t?.id?.trim(), title: (t?.title || t?.id || '').trim() }))
                .filter((t) => t.id);
            if (tabs.length > 0) out.tabs = tabs;
            out.fields = step?.fields ?? [];
        } else if (values.type === 'form') {
            out.fields = step?.fields ?? [];
        } else {
            if (values.exportPdf) out.exportPdf = true;
        }
        if (values.type !== 'summary') {
            out.incompleteNotice = values.incomplete_message
                ? {
                    ...(values.incomplete_title ? { title: values.incomplete_title } : {}),
                    message: values.incomplete_message,
                }
                : undefined;
        }
        onSave?.(out);
        onClose?.();
    };

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title={step?.id ? `Editar paso: ${step.id}` : 'Nuevo paso'}
            width={Math.min(560, window.innerWidth)}
            extra={
                <Space>
                    <Button onClick={onClose}>Cancelar</Button>
                    <Button type="primary" onClick={() => form.submit()}>Guardar</Button>
                </Space>
            }
            destroyOnHidden
        >
            <Form layout="vertical" form={form} onFinish={handleFinish}>
                <Form.Item label="Identificador (sin espacios)" name="id" rules={[
                    { required: true },
                    { pattern: /^[a-z0-9_]+$/, message: 'Solo minúsculas, dígitos y _' },
                ]}>
                    <Input placeholder="general" />
                </Form.Item>
                <Form.Item label="Tipo" name="type" rules={[{ required: true }]}>
                    <Select options={STEP_TYPES} />
                </Form.Item>
                <Form.Item label="Título" name="title" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
                <Form.Item label="Ícono (opcional)" name="icon">
                    <Input />
                </Form.Item>
                {watchType === 'repeater' && (
                    <>
                        <Space.Compact block>
                            <Form.Item label="Min. items" name="minItems" style={{ flex: 1 }}>
                                <InputNumber min={0} style={{ width: '100%' }} />
                            </Form.Item>
                            <Form.Item label="Max. items" name="maxItems" style={{ flex: 1 }}>
                                <InputNumber min={1} style={{ width: '100%' }} />
                            </Form.Item>
                        </Space.Compact>
                        <Form.Item label="Etiqueta de cada item" name="itemLabel"
                            extra='Usa "{{index}}" para el numero. Ej: "Base de datos {{index}}"'>
                            <Input />
                        </Form.Item>
                        <div style={{ marginBottom: 4 }}>Tabs internos (agrupan los campos dentro de cada item)</div>
                        <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>
                            Sin tabs = todos los campos juntos. Cada campo se asigna a un tab por su id.
                        </div>
                        <Form.List name="tabs">
                            {(rows, { add, remove }) => (
                                <div style={{ marginBottom: 16 }}>
                                    {rows.map(({ key, name, ...rest }) => (
                                        <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                                            <Form.Item
                                                {...rest}
                                                name={[name, 'id']}
                                                style={{ marginBottom: 0 }}
                                                rules={[
                                                    { required: true, message: 'id requerido' },
                                                    { pattern: /^[a-z0-9_]+$/, message: 'Solo minúsculas, dígitos y _' },
                                                ]}
                                            >
                                                <Input placeholder="id (ej. datos)" />
                                            </Form.Item>
                                            <Form.Item
                                                {...rest}
                                                name={[name, 'title']}
                                                style={{ marginBottom: 0 }}
                                                rules={[{ required: true, message: 'título requerido' }]}
                                            >
                                                <Input placeholder="Título (ej. Datos generales)" />
                                            </Form.Item>
                                            <Button
                                                type="link"
                                                danger
                                                icon={<DeleteOutlined />}
                                                onClick={() => remove(name)}
                                            />
                                        </Space>
                                    ))}
                                    <Button
                                        type="dashed"
                                        icon={<PlusOutlined />}
                                        onClick={() => add({ id: '', title: '' })}
                                        block
                                    >
                                        Agregar tab
                                    </Button>
                                </div>
                            )}
                        </Form.List>
                    </>
                )}
                {watchType !== 'summary' && (
                    <>
                        <Form.Item
                            label="Aviso si el paso queda incompleto (opcional)"
                            name="incomplete_message"
                            extra="Si se define, al avanzar con campos sin llenar el respondent ve un aviso con este mensaje, sin bloquear el paso siguiente ni el envío."
                        >
                            <Input.TextArea rows={2} placeholder="Aún hay puntos sin marcar. Puedes continuar, pero te recomendamos revisarlos." />
                        </Form.Item>
                        <Form.Item label="Título del aviso" name="incomplete_title">
                            <Input placeholder="Sección incompleta" />
                        </Form.Item>
                    </>
                )}
            </Form>
        </Drawer>
    );
}
