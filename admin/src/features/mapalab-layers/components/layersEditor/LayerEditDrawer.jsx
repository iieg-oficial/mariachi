import { useEffect, useState } from 'react';
import {
    AutoComplete,
    Button,
    Collapse,
    Drawer,
    Form,
    Input,
    Select,
    Space,
    Spin,
    Switch,
    Tag,
    Typography,
} from 'antd';
import { useLayerTreeAdmin } from '@features/mapalab-layers/hooks/useLayerTreeAdmin';
import useIsMobile from '@shared/hooks/useIsMobile';
import InfoBoxPresetForm from './InfoBoxPresetForm';
import InfoBoxPreview from './InfoBoxPreview';
import InfoBoxJsonEditor from './InfoBoxJsonEditor';

const { Text } = Typography;

const NODE_TYPE_OPTIONS = [
    { value: 'tema', label: 'tema' },
    { value: 'category', label: 'category' },
    { value: 'label', label: 'label' },
    { value: 'group', label: 'group' },
    { value: 'leaf', label: 'leaf' },
];


export default function LayerEditDrawer({ open, layer, saving, isAdmin = true, onClose, onSave }) {
    const { isMobile } = useIsMobile();
    const [form] = Form.useForm();
    const { listGeoserverWorkspaces, listGeoserverStyles } = useLayerTreeAdmin();
    const [workspaces, setWorkspaces] = useState([]);
    const [availableStyles, setAvailableStyles] = useState([]);
    const selectedWs = Form.useWatch('workspaceAlias', form);
    const selectedGsLayer = Form.useWatch('geoserverLayer', form);
    const selectedTemplate = Form.useWatch('infoboxTemplate', form);
    const watchedParams = Form.useWatch('infoboxParams', form);
    const watchedConfig = Form.useWatch('infoboxConfig', form);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        listGeoserverWorkspaces()
            .then((data) => { if (!cancelled) setWorkspaces(data); })
            .catch(() => { if (!cancelled) setWorkspaces([]); });
        return () => { cancelled = true; };
    }, [open, listGeoserverWorkspaces]);

    useEffect(() => {
        if (!selectedWs || !selectedGsLayer) return;
        let cancelled = false;
        listGeoserverStyles(selectedWs, selectedGsLayer)
            .then((data) => { if (!cancelled) setAvailableStyles(data); })
            .catch(() => { if (!cancelled) setAvailableStyles([]); });
        return () => { cancelled = true; };
    }, [selectedWs, selectedGsLayer, listGeoserverStyles]);

    useEffect(() => {
        if (layer) {
            form.setFieldsValue({
                label: layer.label,
                nodeType: layer.nodeType,
                hiddenInMenu: layer.hiddenInMenu,
                disabled: layer.disabled,
                workspaceAlias: layer.workspaceAlias,
                geoserverLayer: layer.geoserverLayer,
                styles: layer.styles,
                cqlFilter: layer.cqlFilter,
                wmsGroup: layer.wmsGroup,
                wfsAvailable: layer.wfsAvailable,
                downloadable: layer.downloadable,
                searchTags: (layer.searchMeta?.tags || layer.search_tags || []).join(', '),
                infoboxTemplate: layer.infoboxTemplate,
                infoboxParams: layer.infoboxParams || {},
                infoboxConfig: layer.infoboxConfig || null,
            });
        } else {
            form.resetFields();
        }
    }, [layer, form]);

    const selectedWsObj = workspaces.find((w) => w.alias === selectedWs);
    const availableLayers = selectedWsObj?.layers || [];
    const loadingWs = open && workspaces.length === 0;

    const buildPayload = async () => {
        const values = await form.validateFields();
        const tagsArray = (values.searchTags || '')
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
        return { ...values, searchTags: tagsArray };
    };

    const handleSaveDirect = async () => {
        const payload = await buildPayload();
        onSave(payload);
    };

    const handleSaveDraft = async () => {
        const payload = await buildPayload();
        onSave(payload, { submitForReview: false });
    };

    const handleSubmitReview = async () => {
        const payload = await buildPayload();
        onSave(payload, { submitForReview: true });
    };

    if (!layer) return null;

    return (
        <Drawer
            title={
                <Space wrap>
                    <span>Editar capa</span>
                    <Tag color="purple">{layer.id}</Tag>
                </Space>
            }
            placement={isMobile ? 'bottom' : 'right'}
            styles={{
                wrapper: isMobile
                    ? { width: '100%', height: '92%' }
                    : { width: 600 }
            }}
            open={open}
            onClose={onClose}
            extra={
                <Space wrap size={[8, 8]}>
                    <Button onClick={onClose}>Cancelar</Button>
                    {isAdmin ? (
                        <Button type="primary" loading={saving} onClick={handleSaveDirect}>
                            Guardar
                        </Button>
                    ) : (
                        <>
                            <Button loading={saving} onClick={handleSaveDraft}>
                                Guardar borrador
                            </Button>
                            <Button type="primary" loading={saving} onClick={handleSubmitReview}>
                                Enviar a revisión
                            </Button>
                        </>
                    )}
                </Space>
            }
        >
            <Form form={form} layout="vertical">
                <Collapse
                    defaultActiveKey={['identidad', 'wms']}
                    items={[
                        {
                            key: 'identidad',
                            label: 'Identidad',
                            children: (
                                <>
                                    <Form.Item label="Label" name="label" rules={[{ required: true }]}>
                                        <Input />
                                    </Form.Item>
                                    <Form.Item label="Node type" name="nodeType">
                                        <Select options={NODE_TYPE_OPTIONS} />
                                    </Form.Item>
                                    <Form.Item label="Tags de búsqueda (coma)" name="searchTags">
                                        <Input placeholder="seguridad, delito, feminicidio" />
                                    </Form.Item>
                                </>
                            )
                        },
                        {
                            key: 'visibilidad',
                            label: 'Visibilidad',
                            children: (
                                <>
                                    <Form.Item label="Oculta en menú" name="hiddenInMenu" valuePropName="checked">
                                        <Switch />
                                    </Form.Item>
                                    <Form.Item label="Deshabilitada (prefijo *)" name="disabled" valuePropName="checked">
                                        <Switch />
                                    </Form.Item>
                                </>
                            )
                        },
                        {
                            key: 'wms',
                            label: 'WMS',
                            children: (
                                <>
                                    {loadingWs && <Spin size="small" style={{ marginBottom: 12 }} />}
                                    <Form.Item label="Workspace" name="workspaceAlias">
                                        <Select
                                            showSearch
                                            allowClear
                                            placeholder="Selecciona workspace"
                                            options={workspaces.map((w) => ({
                                                value: w.alias,
                                                label: `${w.label || w.alias} (${w.layers?.length || 0} capas)`,
                                            }))}
                                        />
                                    </Form.Item>
                                    <Form.Item label="Capa GeoServer" name="geoserverLayer">
                                        <AutoComplete
                                            options={availableLayers.map((l) => ({ value: l }))}
                                            filterOption={(input, option) =>
                                                option.value.toLowerCase().includes(input.toLowerCase())
                                            }
                                            placeholder={selectedWs ? 'Elige una capa del workspace' : 'Selecciona workspace primero'}
                                            disabled={!selectedWs}
                                        />
                                    </Form.Item>
                                    <Form.Item label="Estilo" name="styles">
                                        <AutoComplete
                                            options={availableStyles.map((s) => ({ value: s }))}
                                            placeholder="Vacio = estilo por defecto"
                                        />
                                    </Form.Item>
                                    <Form.Item label="CQL filter" name="cqlFilter">
                                        <Input.TextArea rows={2} placeholder="modalidad = 'Con violencia'" />
                                    </Form.Item>
                                    <Form.Item label="WMS group" name="wmsGroup" extra="Capas con mismo grupo se mergean en una request WMS">
                                        <Input />
                                    </Form.Item>
                                </>
                            )
                        },
                        {
                            key: 'descarga',
                            label: 'Descarga',
                            children: (
                                <>
                                    <Form.Item label="WFS disponible" name="wfsAvailable" valuePropName="checked">
                                        <Switch />
                                    </Form.Item>
                                    <Form.Item label="Descargable" name="downloadable" valuePropName="checked">
                                        <Switch />
                                    </Form.Item>
                                </>
                            )
                        },
                        {
                            key: 'infobox',
                            label: 'InfoBox',
                            children: (
                                <>
                                    <Form.Item label="Template" name="infoboxTemplate">
                                        <Select
                                            allowClear
                                            options={[
                                                { value: 'municipio', label: 'municipio' },
                                                { value: 'punto', label: 'punto' },
                                                { value: 'punto_municipio', label: 'punto_municipio' },
                                                { value: 'punto_ubicacion', label: 'punto_ubicacion' },
                                                { value: 'punto_completo', label: 'punto_completo' },
                                                { value: 'custom', label: 'custom (JSON libre)' },
                                            ]}
                                        />
                                    </Form.Item>
                                    {selectedTemplate && selectedTemplate !== 'custom' && (
                                        <InfoBoxPresetForm template={selectedTemplate} />
                                    )}
                                    {selectedTemplate === 'custom' && (
                                        <Form.Item name="infoboxConfig" label="Configuración JSON">
                                            <InfoBoxJsonEditor key={layer?.id} />
                                        </Form.Item>
                                    )}
                                    <div style={{ marginTop: 16 }}>
                                        <Text strong style={{ display: 'block', marginBottom: 8 }}>Preview</Text>
                                        <InfoBoxPreview
                                            template={selectedTemplate}
                                            params={selectedTemplate === 'custom' ? watchedConfig : watchedParams}
                                        />
                                    </div>
                                </>
                            )
                        }
                    ]}
                />
            </Form>
        </Drawer>
    );
}
