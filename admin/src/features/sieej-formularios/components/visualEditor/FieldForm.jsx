import { useEffect, useState } from 'react';
import {
    Button, Col, Form, Input, InputNumber, Row, Segmented, Select, Switch, Space,
} from 'antd';
import OptionsSource from './OptionsSource';
import ShowWhenField from './ShowWhenField';
import useAccessibleBuckets from '@features/acervo/hooks/useAccessibleBuckets';
import useCatalogos from '../../hooks/useCatalogos';
import useIsMobile from '@shared/hooks/useIsMobile';
import { FIELD_TYPES } from '../../constants/definitionTypes';
import { describeCondition } from './fieldUtils';
import FieldPreview from './FieldPreview';

const EXTENSION_OPTIONS = [
    '.pdf', '.csv', '.xlsx', '.xls', '.doc', '.docx', '.txt',
    '.jpg', '.jpeg', '.png', '.zip', '.json', '.geojson', '.kml', '.shp',
].map((ext) => ({ value: ext, label: ext }));

const COLSPAN_HINT = {
    1: 'Grande · ocupa la fila completa',
    2: 'Mediano · ocupa 1/2 de la fila',
    3: 'Chico · ocupa 1/3 de la fila',
};

const HEADER_HEIGHT = 64;
const PREVIEW_STICKY_TOP = HEADER_HEIGHT + 16;

const slugify = (text) => text
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_').replace(/^_|_$/g, '');

const fromForm = (values) => {
    const source = values.option_source ?? (values.catalog ? 'catalog' : 'options');
    const options = source === 'catalog' ? [] : (values.options_list ?? [])
        .map((o) => ({
            value: String(o?.value ?? '').trim(),
            label: String(o?.label ?? '').trim(),
        }))
        .filter((o) => o.value)
        .map((o) => ({ value: o.value, label: o.label || o.value }));
    const catalog = source === 'catalog' ? values.catalog : null;
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
        ...(catalog ? { catalog } : {}),
        ...(showWhen ? { showWhen } : {}),
        ...(Object.keys(validation).length > 0 ? { validation } : {}),
        ...(values.type === 'file' && values.bucket ? { bucket: values.bucket } : {}),
        ...(values.type === 'file' && accept.length > 0 ? { accept } : {}),
        ...(values.type === 'file' && values.maxSizeMB != null ? { maxSizeMB: values.maxSizeMB } : {}),
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
    options_list: (field?.options ?? []).map((o) => ({
        value: String(o.value),
        label: o.label ?? String(o.value),
    })),
    catalog: field?.catalog ?? '',
    option_source: field?.catalog ? 'catalog' : 'options',
    showWhen_field: field?.showWhen?.field ?? '',
    showWhen_equals: field?.showWhen?.equals != null ? String(field.showWhen.equals) : '',
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
    const { catalogos } = useCatalogos();
    const { isMobile } = useIsMobile();

    useEffect(() => {
        form.setFieldsValue(toForm(field));
        setNameTouched(!!field?.name);
    }, [field, form]);

    const watchType = Form.useWatch('type', form);
    const watchLabel = Form.useWatch('label', form);
    const watchColSpan = Form.useWatch('colSpan', form);
    const previewValues = Form.useWatch((v) => v, form) || {};

    useEffect(() => {
        if (!nameTouched && watchLabel) {
            form.setFieldsValue({ name: slugify(watchLabel) });
        }
    }, [watchLabel, nameTouched, form]);

    useEffect(() => {
        if (
            watchType === 'file'
            && !form.getFieldValue('bucket')
            && buckets.some((b) => b.acervo_bucket === 'sieej')
        ) {
            form.setFieldsValue({ bucket: 'sieej' });
        }
    }, [watchType, buckets, form]);

    const handleFinish = (values) => onSave?.(fromForm(values));

    const previewCondition = describeCondition(
        { field: previewValues.showWhen_field, equals: previewValues.showWhen_equals },
        availableShowWhenFields,
        catalogos,
    );

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
                    <Form.Item
                        label="Ancho en columnas"
                        name="colSpan"
                        extra={COLSPAN_HINT[watchColSpan] ?? COLSPAN_HINT[1]}
                    >
                        <Segmented
                            options={[
                                { value: 1, label: 'Grande' },
                                { value: 2, label: 'Mediano' },
                                { value: 3, label: 'Chico' },
                            ]}
                        />
                    </Form.Item>
                    {showOptions && <OptionsSource form={form} />}
                    {showFile && (
                        <>
                            <Form.Item
                                label="Bucket Acervo"
                                name="bucket"
                                rules={[{ required: true }]}
                                extra="Carpeta del Acervo donde se guardan los archivos que suba quien responde el formulario. Por defecto se usa «sieej»."
                            >
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
                    <ShowWhenField form={form} availableFields={availableShowWhenFields} />
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
                            top: PREVIEW_STICKY_TOP,
                            paddingTop: 8,
                            marginBottom: isMobile ? 12 : 0,
                        }}>
                            <div style={{ fontWeight: 500, marginBottom: 8, color: '#191919' }}>
                                Vista previa
                            </div>
                            <FieldPreview values={previewValues} condition={previewCondition} />
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
