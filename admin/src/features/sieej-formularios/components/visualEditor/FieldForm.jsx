import { useEffect, useMemo, useRef, useState } from 'react';
import {
    AutoComplete, Button, Col, Form, Input, InputNumber, Row, Select, Switch, Space,
} from 'antd';
import OptionsSource from './OptionsSource';
import OpenRangeConfig from './OpenRangeConfig';
import ShowWhenField from './ShowWhenField';
import useAccessibleBuckets from '@features/acervo/hooks/useAccessibleBuckets';
import useCatalogos from '../../hooks/useCatalogos';
import useIsMobile from '@shared/hooks/useIsMobile';
import { FIELD_TYPES } from '../../constants/definitionTypes';
import { REGEX_PRESETS } from '../../constants/regexPresets';
import { describeCondition, fieldFromFormValues, fieldToFormValues } from './fieldUtils';
import { nearestCol } from './fieldLayout';
import { LayoutSection } from './LayoutControls';
import FieldPreview from './FieldPreview';

const EXTENSION_OPTIONS = [
    '.pdf', '.csv', '.xlsx', '.xls', '.doc', '.docx', '.txt',
    '.jpg', '.jpeg', '.png', '.zip', '.json', '.geojson', '.gpkg', '.kml', '.shp',
].map((ext) => ({ value: ext, label: ext }));

const REGEX_OPTIONS = REGEX_PRESETS.map((preset) => ({
    value: preset.pattern,
    text: `${preset.label} ${preset.pattern}`,
    label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span>{preset.label}</span>
            <code style={{ color: '#999', fontSize: 12 }}>{preset.pattern}</code>
        </div>
    ),
}));

const HEADER_HEIGHT = 64;
const PREVIEW_STICKY_TOP = HEADER_HEIGHT + 16;

const slugify = (text) => text
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_').replace(/^_|_$/g, '');

export default function FieldForm({
    form: externalForm, field, availableTabs = [], availableShowWhenFields = [],
    resolveSlots, previousField = null, defaultCol = 1, onLayoutDraft, onSave, onCancel,
}) {
    const [internalForm] = Form.useForm();
    const form = externalForm || internalForm;
    const [nameTouched, setNameTouched] = useState(!!field?.name);
    const [tooltipFocused, setTooltipFocused] = useState(false);
    const onLayoutDraftRef = useRef(onLayoutDraft);
    const { buckets, loading: bucketsLoading } = useAccessibleBuckets();
    const { catalogos } = useCatalogos();
    const { isMobile } = useIsMobile();

    const fieldKey = useMemo(() => `${field?.name ?? ''}:${JSON.stringify(field?.layout ?? {})}`, [field]);
    useEffect(() => {
        form.setFieldsValue(fieldToFormValues(field, defaultCol));
        setNameTouched(!!field?.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fieldKey, form]);

    const watchType = Form.useWatch('type', form);
    const watchLabel = Form.useWatch('label', form);
    const watchColSpan = Form.useWatch('colSpan', form);
    const watchCol = Form.useWatch('col', form);
    const watchAlone = Form.useWatch('alone', form);
    const watchNewRow = Form.useWatch('newRow', form);
    const watchPattern = Form.useWatch('pattern', form);
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

    const handleFinish = (values) => onSave?.(fieldFromFormValues(values));

    const colSpan = watchColSpan ?? 1;
    const col = nearestCol(colSpan, watchCol ?? 1);
    const alone = colSpan !== 1 && !!watchAlone;
    const newRow = col === 1 || !!watchNewRow;
    const slots = resolveSlots?.(colSpan, col, alone) ?? [];
    const sharesLine = !!previousField
        && slots.some((s) => s.kind === 'field' && s.name === previousField.name);

    useEffect(() => {
        onLayoutDraftRef.current = onLayoutDraft;
    }, [onLayoutDraft]);

    useEffect(() => {
        onLayoutDraftRef.current?.({ colSpan, col, alone, newRow });
    }, [colSpan, col, alone, newRow]);

    useEffect(() => () => onLayoutDraftRef.current?.(null), []);

    const handleColSpanChange = (value) => {
        const next = nearestCol(value, form.getFieldValue('col') ?? 1);
        if (next !== form.getFieldValue('col')) form.setFieldsValue({ col: next });
    };

    const handlePatternSelect = (value) => {
        const preset = REGEX_PRESETS.find((p) => p.pattern === value);
        if (!preset) return;
        const current = form.getFieldValue('patternMessage');
        const isAutoMessage = !current || REGEX_PRESETS.some((p) => p.message === current);
        if (isAutoMessage) {
            form.setFieldsValue({ patternMessage: preset.message });
        }
    };

    const previewCondition = describeCondition(
        { field: previewValues.showWhen_field, equals: previewValues.showWhen_equals },
        availableShowWhenFields,
        catalogos,
    );

    const showOptions = ['select', 'select_multiple', 'radio', 'checkbox'].includes(watchType);
    const showDateRange = watchType === 'date_range';
    const showFile = watchType === 'file';
    const showNumberValidation = watchType === 'number';
    const showLengthValidation = ['text', 'textarea'].includes(watchType);

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
                    <Form.Item
                        label="¿Editable después de enviar?"
                        name="editableAfterSubmit"
                        valuePropName="checked"
                        extra="Permite corregir este campo sin reabrir el formulario; cada cambio queda en el historial."
                    >
                        <Switch />
                    </Form.Item>
                    <Form.Item label="Placeholder" name="placeholder">
                        <Input />
                    </Form.Item>
                    <Form.Item label="Tooltip" name="tooltip">
                        <Input
                            onFocus={() => setTooltipFocused(true)}
                            onBlur={() => setTooltipFocused(false)}
                        />
                    </Form.Item>
                    {availableTabs.length > 0 && (
                        <Form.Item label="Pestaña" name="tab" rules={[{ required: true }]}>
                            <Select options={availableTabs.map((t) => ({ value: t.id, label: t.title || t.id }))} />
                        </Form.Item>
                    )}
                    <LayoutSection
                        colSpan={colSpan}
                        col={col}
                        alone={alone}
                        newRow={newRow}
                        previousLabel={previousField?.label}
                        sharesLine={sharesLine}
                        onPickColSpan={handleColSpanChange}
                    />
                    {showOptions && <OptionsSource form={form} />}
                    {showDateRange && <OpenRangeConfig form={form} />}
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
                                label="Patrón de validación"
                                name="pattern"
                                extra="Elige un formato común de la lista o escribe tu propio regex. Vacío no aplica ningún patrón."
                            >
                                <AutoComplete
                                    allowClear
                                    options={REGEX_OPTIONS}
                                    filterOption={(input, option) => option.text
                                        .toLowerCase().includes(input.toLowerCase())}
                                    onSelect={handlePatternSelect}
                                    placeholder="^\d{10}$ o busca «teléfono», «CURP», «correo»…"
                                />
                            </Form.Item>
                            {watchPattern && (
                                <Form.Item
                                    label="Mensaje de validación"
                                    name="patternMessage"
                                    extra="Se muestra cuando el valor no cumple el patrón."
                                >
                                    <Input placeholder="Ingresa un teléfono válido de 10 dígitos" />
                                </Form.Item>
                            )}
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
                            <FieldPreview
                                values={previewValues}
                                condition={previewCondition}
                                tooltipActive={tooltipFocused}
                                slots={slots}
                            />
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
