import { useEffect } from 'react';
import { Alert, Button, Drawer, Form, Input, InputNumber, Select, Space } from 'antd';
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
            if (step?.tabs?.length) out.tabs = step.tabs;
            out.fields = step?.fields ?? [];
        } else if (values.type === 'form') {
            out.tabs = undefined;
            out.fields = step?.fields ?? [];
        } else {
            out.tabs = undefined;
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
                        <Alert
                            type="info"
                            showIcon
                            style={{ marginBottom: 16 }}
                            message="Los tabs internos se administran junto a los campos del paso, en la pestaña que agrupa cada uno."
                        />
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
