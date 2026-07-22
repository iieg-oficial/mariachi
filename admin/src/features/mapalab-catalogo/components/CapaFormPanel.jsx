import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Form, Input, Select, Space, Switch, message } from 'antd';
import { actualizarCapa, crearCapa } from '../api/catalogoService';
import { useGeoserverLayers } from '../hooks/useGeoserverLayers';

const EMPTY_FORM = {
    slug: '',
    nombre: '',
    workspaceAlias: undefined,
    geoserverLayer: undefined,
    searchTags: [],
    enabled: true,
};

const slugify = (text) => (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);

const CapaFormPanel = ({ workspaceOptions, tagOptions, editing, onCancel, onSaved }) => {
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);
    const watchedWorkspace = Form.useWatch('workspaceAlias', form);
    const { layers: gsLayers, loading: gsLoading } = useGeoserverLayers(watchedWorkspace);

    useEffect(() => {
        if (editing) {
            form.setFieldsValue({
                slug: editing.slug,
                nombre: editing.nombre,
                workspaceAlias: editing.workspaceAlias,
                geoserverLayer: editing.geoserverLayer,
                searchTags: editing.searchTags || [],
                enabled: editing.enabled,
            });
        } else {
            form.setFieldsValue(EMPTY_FORM);
        }
    }, [editing, form]);

    const layerOptions = useMemo(() => {
        const opts = gsLayers.map((l) => ({
            value: l.name,
            label: l.title ? `${l.name} — ${l.title}` : l.name,
        }));
        if (editing?.geoserverLayer && !gsLayers.some((l) => l.name === editing.geoserverLayer)) {
            opts.unshift({ value: editing.geoserverLayer, label: editing.geoserverLayer });
        }
        return opts;
    }, [gsLayers, editing]);

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
            if (editing) {
                await actualizarCapa(editing.id, values);
                message.success('Capa actualizada');
            } else {
                await crearCapa(values);
                message.success('Capa creada');
            }
            onSaved?.();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al guardar la capa');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card size="small" title={editing ? 'Editar capa' : 'Agregar capa'} style={{ marginBottom: 16 }}>
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
