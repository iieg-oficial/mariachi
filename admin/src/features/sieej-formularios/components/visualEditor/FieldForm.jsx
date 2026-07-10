import { useEffect, useState } from 'react';
import {
    Button, Col, Form, Input, InputNumber, Row, Segmented, Select, Switch, Space,
} from 'antd';
import useAccessibleBuckets from '@features/acervo/hooks/useAccessibleBuckets';
import useIsMobile from '@shared/hooks/useIsMobile';
import { FIELD_TYPES } from '../../constants/definitionTypes';
import FieldPreview from './FieldPreview';
import { parseOptions } from './fieldUtils';

const EXTENSION_OPTIONS = [
    '.pdf', '.csv', '.xlsx', '.xls', '.doc', '.docx', '.txt',
    '.jpg', '.jpeg', '.png', '.zip', '.json', '.geojson', '.kml', '.shp',
].map((ext) => ({ value: ext, label: ext }));

const slugify = (text) => text
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_').replace(/^_|_$/g, '');

const fromForm = (values) => {
    const options = parseOptions(values.options_text);
    const showWhen = values.showWhen_field
        ? { field: values.showWhen_field, equals: values.showWhen_equals ?? '' }
        : undefined;
    const validation = {};
    if (values.minLength != null) validation.minLength = values.minLength;
    if (values.maxLength != null) validation.maxLength = values.maxLength;
    if (values.pattern) validation.pattern = values.pattern;
    if (values.pattern && values.patternMessage) validation.patternMessage = values.patternMessage;
    if (values.min != null) validation.min = values.min;
    if (values.max != null) validation.max = values.max;

    const accept = Array.isArray(values.accept)
        ? values.accept.map((x) => x.trim()).filter(Boolean)
        : [];

    const colSpan = values.colSpan ?? 1;

    return {
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
        ...(accept.length > 0 ? { accept } : {}),
        ...(values.maxSizeMB != null ? { maxSizeMB: values.maxSizeMB } : {}),
        layout: { colSpan },
    };
};

const toForm = (field) => ({
    name: field?.name ?? '',
    label: field?.label ?? '',
    type: field?.type ?? undefined,
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
    patternMessage: field?.validation?.patternMessage ?? '',
    min: field?.validation?.min,
    max: field?.validation?.max,
    bucket: field?.bucket ?? undefined,
    accept: field?.accept ?? [],
    maxSizeMB: field?.maxSizeMB,
    colSpan: field?.layout?.colSpan ?? 1,
});

export default function FieldForm({
    form: externalForm, field, availableTabs = [], availableShowWhenFields = [], onSave, onCancel,
}) {
    const [internalForm] = Form.useForm();
    const form = externalForm || internalForm;
    const [nameTouched, setNameTouched] = useState(!!field?.name);
    const { buckets, loading: bucketsLoading } = useAccessibleBuckets();
    const { isMobile } = useIsMobile();

    useEffect(() => {
        form.setFieldsValue(toForm(field));
        setNameTouched(!!field?.name);
    }, [field, form]);

    const watchType = Form.useWatch('type', form);
    const watchLabel = Form.useWatch('label', form);
    const previewValues = Form.useWatch((v) => v, form) || {};

    useEffect(() => {
        if (!nameTouched && watchLabel) {
            form.setFieldsValue({ name: slugify(watchLabel) });
        }
    }, [watchLabel, nameTouched, form]);

    const handleFinish = (values) => onSave?.(fromForm(values));

    const showOptions = ['select', 'select_multiple', 'radio', 'checkbox'].includes(watchType);
    const showFile = watchType === 'file';
    const showNumberValidation = watchType === 'number';
    const showLengthValidation = ['text', 'textarea', 'email', 'tel'].includes(watchType);

    const bucketOptions = buckets.map((b) => ({
        value: b.acervo_bucket,
        label: b.display_name || b.acervo_bucket,
    }));

    const formFields = (
        <>
            <Form.Item label="Tipo de campo" name="type" rules={[{ required: true }]}>
                <Select placeholder="Selecciona el tipo de campo" options={FIELD_TYPES} />
            </Form.Item>
            {!watchType && (
                <p style={{ color: '#888', margin: 0 }}>
                    Elige el tipo de campo para configurar sus opciones.
                </p>
            )}
            {watchType && (
                <>
                    <Form.Item label="Etiqueta" name="label" rules={[{ required: true }]}>
                        <Input placeholder="Razón social" />
                    </Form.Item>
                    <Form.Item label="Nombre interno (sin espacios)" name="name" rules={[
                        { required: true },
                        { pattern: /^[a-z0-9_]+$/, message: 'Solo minúsculas, dígitos y _' },
                    ]}>
                        <Input placeholder="razon_social" onChange={() => setNameTouched(true)} />
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
                    <Form.Item label="Ancho en columnas" name="colSpan">
                        <Segmented
                            options={[
                                { value: 1, label: 'Grande' },
                                { value: 2, label: 'Mediano' },
                                { value: 3, label: 'Chico' },
                            ]}
                        />
                    </Form.Item>
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
                                <Select
                                    placeholder="Selecciona un bucket"
                                    loading={bucketsLoading}
                                    showSearch
                                    optionFilterProp="label"
                                    options={bucketOptions}
                                />
                            </Form.Item>
                            <Form.Item
                                label="Extensiones aceptadas"
                                name="accept"
                                extra="Selecciona de la lista o escribe una extensión con punto. Vacío acepta todos los formatos."
                            >
                                <Select
                                    mode="tags"
                                    allowClear
                                    tokenSeparators={[',', ' ']}
                                    options={EXTENSION_OPTIONS}
                                    placeholder=".pdf, .csv, .xlsx"
                                />
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
                            <Form.Item
                                label="Patrón regex"
                                name="pattern"
                                extra="Ej: ^\d{10}$ (teléfono 10 dígitos). Vacío usa el default del tipo de campo."
                            >
                                <Input placeholder="^\d{10}$" />
                            </Form.Item>
                            <Form.Item
                                label="Mensaje de validación"
                                name="patternMessage"
                                extra="Se muestra cuando el valor no cumple el patrón. Requiere un patrón definido."
                            >
                                <Input placeholder="Ingresa un teléfono válido de 10 dígitos" />
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
                </>
            )}
        </>
    );

    return (
        <Form layout="vertical" form={form} onFinish={handleFinish} style={{ marginTop: 12 }}>
            <Row gutter={16}>
                {watchType && (
                    <Col xs={24} md={24} xl={10}>
                        <div style={{
                            position: 'sticky',
                            top: 16,
                            marginBottom: isMobile ? 12 : 0,
                        }}>
                            <div style={{ fontWeight: 500, marginBottom: 8, color: '#191919' }}>
                                Vista previa
                            </div>
                            <FieldPreview values={previewValues} />
                        </div>
                    </Col>
                )}
                <Col xs={24} md={24} xl={watchType ? 14 : 24}>
                    {!watchType && (
                        <div style={{ color: '#999', fontSize: 12, border: '1px dashed #d9d9d9', borderRadius: 8, padding: 16, marginBottom: 12 }}>
                            Elige un tipo de campo para ver la vista previa.
                        </div>
                    )}
                    {formFields}
                </Col>
            </Row>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <Button size="small" onClick={onCancel}>Cancelar</Button>
                <Button size="small" type="primary" onClick={() => form.submit()}>Guardar</Button>
            </div>
        </Form>
    );
}
