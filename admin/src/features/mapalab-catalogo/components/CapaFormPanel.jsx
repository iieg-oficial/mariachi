import { useMemo, useState } from 'react';
import { Button, Card, Form, Input, Select, Space, Switch, message } from 'antd';
import { crearCapa } from '../api/catalogoService';
import { useGeoserverLayers } from '../hooks/useGeoserverLayers';

const EMPTY_FORM = {
    slug: '',
    nombre: '',
    workspaceAlias: undefined,
    geoserverLayer: undefined,
    searchTags: [],
    institucionId: null,
    enabled: true,
};

const slugify = (text) => (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);

const CapaFormPanel = ({ workspaceOptions, tagOptions, instituciones = [], onCancel, onSaved }) => {
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);
    const watchedWorkspace = Form.useWatch('workspaceAlias', form);
    const { layers: gsLayers, loading: gsLoading } = useGeoserverLayers(watchedWorkspace);

    const layerOptions = useMemo(
        () => gsLayers.map((l) => ({
            value: l.name,
            label: l.title ? `${l.name} — ${l.title}` : l.name,
        })),
        [gsLayers],
    );

    const handleWorkspaceChange = () => form.setFieldValue('geoserverLayer', undefined);

    const handleLayerChange = (layerName) => {
        if (!layerName) return;
        const selected = gsLayers.find((l) => l.name === layerName);
        if (!form.getFieldValue('nombre')) form.setFieldValue('nombre', selected?.title || layerName);
        if (!form.getFieldValue('slug')) form.setFieldValue('slug', slugify(layerName));
    };

    const handleSave = async () => {
        let values;
        try {
            values = await form.validateFields();
        } catch {
            return;
        }
        setSaving(true);
        try {
            await crearCapa(values);
            message.success('Capa creada');
            form.setFieldsValue(EMPTY_FORM);
            onSaved?.();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al guardar la capa');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card size="small" title="Agregar capa" style={{ marginBottom: 16 }}>
            <Form form={form} layout="vertical" initialValues={EMPTY_FORM}>
                <Form.Item name="workspaceAlias" label="Workspace" rules={[{ required: true, message: 'Workspace requerido' }]}>
                    <Select
                        showSearch
                        optionFilterProp="label"
                        options={workspaceOptions}
                        placeholder="Selecciona workspace"
                        onChange={handleWorkspaceChange}
                    />
                </Form.Item>
                <Form.Item name="geoserverLayer" label="Capa de GeoServer" rules={[{ required: true, message: 'Capa requerida' }]}>
                    <Select
                        showSearch
                        loading={gsLoading}
                        disabled={!watchedWorkspace}
                        options={layerOptions}
                        placeholder={watchedWorkspace ? 'Selecciona una capa' : 'Elige un workspace primero'}
                        onChange={handleLayerChange}
                        notFoundContent={gsLoading ? 'Cargando…' : 'Sin capas'}
                    />
                </Form.Item>
                <Form.Item
                    name="nombre"
                    label="Nombre"
                    tooltip="Si lo dejas vacío se toma el título que tiene la capa en GeoServer."
                >
                    <Input placeholder="Se toma de GeoServer si lo dejas vacío" />
                </Form.Item>
                <Form.Item
                    name="slug"
                    label="Slug"
                    tooltip="Si lo dejas vacío se genera a partir del nombre de la capa."
                    rules={[{
                        validator: (_, v) => (!v || /^[a-z0-9-]+$/.test(v)
                            ? Promise.resolve()
                            : Promise.reject(new Error('Solo minúsculas, números y guiones'))),
                    }]}
                >
                    <Input placeholder="Se genera de la capa si lo dejas vacío" />
                </Form.Item>
                <Form.Item
                    name="institucionId"
                    label="Institución"
                    tooltip="Agrupa la capa en el catálogo público. Se administran en la pestaña «Instituciones»."
                >
                    <Select
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        options={instituciones.map((i) => ({ value: i.id, label: i.nombre }))}
                        placeholder="Sin institución"
                    />
                </Form.Item>
                <Form.Item name="searchTags" label="Etiquetas de búsqueda">
                    <Select
                        mode="tags"
                        tokenSeparators={[',']}
                        options={tagOptions.map((t) => ({ value: t, label: t }))}
                        placeholder="Reutiliza etiquetas existentes o crea nuevas"
                    />
                </Form.Item>
                <Form.Item name="enabled" label="Habilitada" valuePropName="checked">
                    <Switch />
                </Form.Item>
            </Form>
            <Space>
                <Button type="primary" onClick={handleSave} loading={saving}>Guardar</Button>
                <Button onClick={onCancel}>Cancelar</Button>
            </Space>
        </Card>
    );
};

export default CapaFormPanel;
