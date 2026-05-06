import { useEffect } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Select, Space } from 'antd';

const STEP_TYPES = [
    { value: 'form', label: 'Formulario plano' },
    { value: 'repeater', label: 'Lista repetible' },
    { value: 'summary', label: 'Resumen final' },
];

const tabsToText = (tabs) => (tabs ?? []).map((t) => `${t.id} | ${t.title}`).join('\n');
const tabsFromText = (text) => (text ?? '')
    .split('\n').map((l) => l.trim()).filter(Boolean)
    .map((line) => {
        const [id, ...rest] = line.split('|');
        return { id: id.trim(), title: (rest.join('|') || id).trim() };
    });

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
            tabs_text: tabsToText(step?.tabs),
            exportPdf: step?.exportPdf ?? false,
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
            const tabs = tabsFromText(values.tabs_text);
            if (tabs.length > 0) out.tabs = tabs;
            out.fields = step?.fields ?? [];
        } else if (values.type === 'form') {
            out.fields = step?.fields ?? [];
        } else {
            if (values.exportPdf) out.exportPdf = true;
        }
        onSave?.(out);
        onClose?.();
    };

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title={step?.id ? `Editar step: ${step.id}` : 'Nuevo step'}
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
                        <Form.Item
                            label="Tabs internos (una por linea: id | titulo)"
                            name="tabs_text"
                            extra="Vacio = sin tabs"
                        >
                            <Input.TextArea rows={3} placeholder={'datos | Datos generales\ndiccionario | Diccionario'} />
                        </Form.Item>
                    </>
                )}
            </Form>
        </Drawer>
    );
}
