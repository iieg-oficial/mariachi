import { useEffect } from 'react';
import {
    Button, Drawer, Form, Input, InputNumber, Select, Switch, Space,
} from 'antd';
import { FIELD_TYPES } from '../../constants/definitionTypes';

const slugify = (text) => text
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_').replace(/^_|_$/g, '');

const fromForm = (values) => {
    const opts = (values.options_text || '').split('\n').map((l) => l.trim()).filter(Boolean);
    const options = opts.map((line) => {
        const [v, ...rest] = line.split('|');
        return { value: v.trim(), label: (rest.join('|') || v).trim() };
    });
    const showWhen = values.showWhen_field
        ? { field: values.showWhen_field, equals: values.showWhen_equals ?? '' }
        : undefined;
    const validation = {};
    if (values.minLength != null) validation.minLength = values.minLength;
    if (values.maxLength != null) validation.maxLength = values.maxLength;
    if (values.pattern) validation.pattern = values.pattern;
    if (values.min != null) validation.min = values.min;
    if (values.max != null) validation.max = values.max;

    const out = {
        name: values.name,
        label: values.label,
        type: values.type,
        ...(values.required ? { required: true } : {}),
        ...(values.placeholder ? { placeholder: values.placeholder } : {}),
        ...(values.tooltip ? { tooltip: values.tooltip } : {}),
        ...(values.tab ? { tab: values.tab } : {}),
        ...(options.length > 0 ? { options } : {}),
        ...(values.catalog ? { catalog: values.catalog } : {}),
        ...(showWhen ? { showWhen } : {}),
        ...(Object.keys(validation).length > 0 ? { validation } : {}),
        ...(values.bucket ? { bucket: values.bucket } : {}),
        ...(values.accept ? { accept: values.accept.split(',').map((x) => x.trim()).filter(Boolean) } : {}),
        ...(values.maxSizeMB != null ? { maxSizeMB: values.maxSizeMB } : {}),
    };
    return out;
};

const toForm = (field) => ({
    name: field?.name ?? '',
    label: field?.label ?? '',
    type: field?.type ?? 'text',
    required: !!field?.required,
    placeholder: field?.placeholder ?? '',
    tooltip: field?.tooltip ?? '',
    tab: field?.tab ?? undefined,
    options_text: (field?.options ?? []).map((o) => `${o.value} | ${o.label}`).join('\n'),
    catalog: field?.catalog ?? '',
    showWhen_field: field?.showWhen?.field ?? '',
    showWhen_equals: field?.showWhen?.equals ?? '',
    minLength: field?.validation?.minLength,
    maxLength: field?.validation?.maxLength,
    pattern: field?.validation?.pattern ?? '',
    min: field?.validation?.min,
    max: field?.validation?.max,
    bucket: field?.bucket ?? '',
    accept: (field?.accept ?? []).join(','),
    maxSizeMB: field?.maxSizeMB,
});

export default function FieldDrawer({
    open, field, availableTabs = [], availableShowWhenFields = [], onSave, onClose,
}) {
    const [form] = Form.useForm();

    useEffect(() => {
        if (open) form.setFieldsValue(toForm(field));
    }, [open, field, form]);

    const watchType = Form.useWatch('type', form);
    const watchLabel = Form.useWatch('label', form);

    useEffect(() => {
        if (!field?.name && watchLabel) {
            const auto = slugify(watchLabel);
            if (auto && !form.getFieldValue('name')) form.setFieldsValue({ name: auto });
        }
    }, [watchLabel, field?.name, form]);

    const handleFinish = (values) => {
        onSave?.(fromForm(values));
        onClose?.();
    };

    const showOptions = ['select', 'select_multiple', 'radio', 'checkbox'].includes(watchType);
    const showFile = watchType === 'file';
    const showNumberValidation = watchType === 'number';
    const showLengthValidation = ['text', 'textarea', 'email', 'tel'].includes(watchType);

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title={field?.name ? `Editar campo: ${field.name}` : 'Nuevo campo'}
            width={Math.min(640, window.innerWidth)}
            extra={
                <Space>
                    <Button onClick={onClose}>Cancelar</Button>
                    <Button type="primary" onClick={() => form.submit()}>Guardar</Button>
                </Space>
            }
            destroyOnHidden
        >
            <Form layout="vertical" form={form} onFinish={handleFinish}>
                <Form.Item label="Etiqueta" name="label" rules={[{ required: true }]}>
                    <Input placeholder="Razón social" />
                </Form.Item>
                <Form.Item label="Nombre interno (sin espacios)" name="name" rules={[
                    { required: true },
                    { pattern: /^[a-z0-9_]+$/, message: 'Solo minúsculas, dígitos y _' },
                ]}>
                    <Input placeholder="razon_social" />
                </Form.Item>
                <Form.Item label="Tipo" name="type" rules={[{ required: true }]}>
                    <Select options={FIELD_TYPES} />
                </Form.Item>
                <Form.Item label="¿Requerido?" name="required" valuePropName="checked">
                    <Switch />
                </Form.Item>
                <Form.Item label="Placeholder" name="placeholder">
                    <Input />
                </Form.Item>
                <Form.Item label="Tooltip" name="tooltip">
                    <Input />
                </Form.Item>
                {availableTabs.length > 0 && (
                    <Form.Item label="Tab" name="tab">
                        <Select allowClear options={availableTabs.map((t) => ({ value: t.id, label: t.title }))} />
                    </Form.Item>
                )}
                {showOptions && (
                    <>
                        <Form.Item
                            label="Opciones (una por línea, formato: valor | etiqueta)"
                            name="options_text"
                            extra='Ejemplo: "true | Sí" en una línea, "false | No" en otra. Vacio si usas catálogo.'
                        >
                            <Input.TextArea rows={4} placeholder={'true | Sí\nfalse | No'} />
                        </Form.Item>
                        <Form.Item label="Catálogo (alternativa a opciones)" name="catalog">
                            <Input placeholder="unidades_admin" />
                        </Form.Item>
                    </>
                )}
                {showFile && (
                    <>
                        <Form.Item label="Bucket Acervo" name="bucket" rules={[{ required: true }]}>
                            <Input placeholder="sieej" />
                        </Form.Item>
                        <Form.Item label="Extensiones aceptadas (coma)" name="accept">
                            <Input placeholder=".pdf,.csv,.xlsx" />
                        </Form.Item>
                        <Form.Item label="Tamaño máximo (MB)" name="maxSizeMB">
                            <InputNumber min={1} max={100} style={{ width: '100%' }} />
                        </Form.Item>
                    </>
                )}
                {showNumberValidation && (
                    <Space.Compact block>
                        <Form.Item label="Min" name="min" style={{ flex: 1 }}>
                            <InputNumber style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item label="Max" name="max" style={{ flex: 1 }}>
                            <InputNumber style={{ width: '100%' }} />
                        </Form.Item>
                    </Space.Compact>
                )}
                {showLengthValidation && (
                    <>
                        <Space.Compact block>
                            <Form.Item label="Long. min" name="minLength" style={{ flex: 1 }}>
                                <InputNumber min={0} style={{ width: '100%' }} />
                            </Form.Item>
                            <Form.Item label="Long. max" name="maxLength" style={{ flex: 1 }}>
                                <InputNumber min={1} style={{ width: '100%' }} />
                            </Form.Item>
                        </Space.Compact>
                        <Form.Item label="Patrón regex" name="pattern">
                            <Input placeholder="^\\d{1,9}$" />
                        </Form.Item>
                    </>
                )}
                {availableShowWhenFields.length > 0 && (
                    <Space.Compact block>
                        <Form.Item label="Mostrar cuando: campo" name="showWhen_field" style={{ flex: 1 }}>
                            <Select allowClear options={availableShowWhenFields.map((n) => ({ value: n, label: n }))} />
                        </Form.Item>
                        <Form.Item label="...es igual a" name="showWhen_equals" style={{ flex: 1 }}>
                            <Input placeholder="true" />
                        </Form.Item>
                    </Space.Compact>
                )}
            </Form>
        </Drawer>
    );
}
