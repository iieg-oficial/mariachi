import { useEffect, useMemo, useState } from 'react';
import { Button, Col, Descriptions, Form, Input, Row, Select, Space, Switch, Typography, message } from 'antd';
import { actualizarCapa } from '../api/catalogoService';
import { useGeoserverLayers } from '../hooks/useGeoserverLayers';

const { Text } = Typography;

const CapaDetalleEditor = ({ capa, workspaceOptions, tagOptions, instituciones, onSaved }) => {
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const watchedWorkspace = Form.useWatch('workspaceAlias', form);
    const { layers: gsLayers, loading: gsLoading } = useGeoserverLayers(watchedWorkspace);

    const valoresIniciales = useMemo(() => ({
        nombre: capa.nombre,
        slug: capa.slug,
        workspaceAlias: capa.workspaceAlias,
        geoserverLayer: capa.geoserverLayer,
        institucionId: capa.institucionId ?? null,
        searchTags: capa.searchTags || [],
        enabled: capa.enabled,
    }), [capa]);

    useEffect(() => {
        form.setFieldsValue(valoresIniciales);
        setDirty(false);
    }, [form, valoresIniciales]);

    const layerOptions = useMemo(() => {
        const opts = gsLayers.map((l) => ({
            value: l.name,
            label: l.title ? `${l.name} — ${l.title}` : l.name,
        }));
        if (capa.geoserverLayer && !gsLayers.some((l) => l.name === capa.geoserverLayer)) {
            opts.unshift({ value: capa.geoserverLayer, label: capa.geoserverLayer });
        }
        return opts;
    }, [gsLayers, capa.geoserverLayer]);

    const handleSave = async () => {
        let values;
        try {
            values = await form.validateFields();
        } catch {
            return;
        }
        setSaving(true);
        try {
            await actualizarCapa(capa.id, values);
            message.success('Capa actualizada');
            setDirty(false);
            onSaved?.();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo guardar la capa');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        form.setFieldsValue(valoresIniciales);
        setDirty(false);
    };

    return (
        <Form
            form={form}
            layout="vertical"
            size="small"
            initialValues={valoresIniciales}
            onValuesChange={() => setDirty(true)}
        >
            <Row gutter={16}>
                <Col xs={24} md={8}>
                    <Form.Item name="nombre" label="Nombre" rules={[{ required: true, message: 'Nombre requerido' }]}>
                        <Input />
                    </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                    <Form.Item
                        name="slug"
                        label="Slug"
                        tooltip="Alimenta la URL pública. No puede repetirse con el de otra capa o institución."
                        rules={[{
                            validator: (_, v) => (!v || /^[a-z0-9-]+$/.test(v)
                                ? Promise.resolve()
                                : Promise.reject(new Error('Solo minúsculas, números y guiones'))),
                        }]}
                    >
                        <Input />
                    </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                    <Form.Item name="institucionId" label="Institución">
                        <Select
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            placeholder="Sin institución"
                            options={instituciones.map((i) => ({ value: i.id, label: i.nombre }))}
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                    <Form.Item name="workspaceAlias" label="Workspace" rules={[{ required: true }]}>
                        <Select
                            showSearch
                            optionFilterProp="label"
                            options={workspaceOptions}
                            onChange={() => form.setFieldValue('geoserverLayer', undefined)}
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                    <Form.Item name="geoserverLayer" label="Capa de GeoServer" rules={[{ required: true }]}>
                        <Select
                            showSearch
                            loading={gsLoading}
                            options={layerOptions}
                            notFoundContent={gsLoading ? 'Cargando…' : 'Sin capas'}
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                    <Form.Item name="searchTags" label="Etiquetas de búsqueda">
                        <Select
                            mode="tags"
                            tokenSeparators={[',']}
                            options={tagOptions.map((t) => ({ value: t, label: t }))}
                            placeholder="Escribe y Enter"
                        />
                    </Form.Item>
                </Col>
            </Row>

            <Space wrap align="center" style={{ marginBottom: 12 }}>
                <Form.Item name="enabled" label="Habilitada" valuePropName="checked" style={{ marginBottom: 0 }}>
                    <Switch size="small" checkedChildren="Sí" unCheckedChildren="No" />
                </Form.Item>
                <Button type="primary" onClick={handleSave} loading={saving} disabled={!dirty}>
                    Guardar
                </Button>
                <Button onClick={handleReset} disabled={!dirty || saving}>
                    Descartar
                </Button>
            </Space>

            <Descriptions size="small" column={3}>
                <Descriptions.Item label="URL pública">
                    <code>/catalogo/{capa.slug}</code>
                </Descriptions.Item>
                <Descriptions.Item label="Última edición">
                    {capa.updatedBy || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Orden">
                    <Text type="secondary">{capa.orden}</Text>
                </Descriptions.Item>
            </Descriptions>
        </Form>
    );
};

export default CapaDetalleEditor;
