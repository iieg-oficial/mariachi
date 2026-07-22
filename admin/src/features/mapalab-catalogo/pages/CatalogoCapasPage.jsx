import { useEffect, useMemo, useState } from 'react';
import {
    Button,
    Form,
    Input,
    Modal,
    Select,
    Space,
    Switch,
    Table,
    Tabs,
    Typography,
    message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { buildColumns } from '../components/catalogoColumns';
import {
    actualizarCapa,
    crearCapa,
    eliminarCapa,
    listCapas,
    listGeoserverLayers,
    listTags,
    listWorkspaces,
} from '../api/catalogoService';
import BulkByWorkspace from '../components/BulkByWorkspace';

const { Title } = Typography;

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

const CatalogoCapasPage = () => {
    const [form] = Form.useForm();
    const [capas, setCapas] = useState([]);
    const [workspaces, setWorkspaces] = useState([]);
    const [tagOptions, setTagOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [workspaceFilter, setWorkspaceFilter] = useState(null);
    const [gsLayers, setGsLayers] = useState([]);
    const [gsLoading, setGsLoading] = useState(false);

    const watchedWorkspace = Form.useWatch('workspaceAlias', form);

    const loadCapas = async () => {
        setLoading(true);
        try {
            setCapas(await listCapas());
        } catch {
            message.error('No se pudieron cargar las capas del catálogo');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCapas();
        listWorkspaces().then(setWorkspaces).catch(() => {});
        listTags().then(setTagOptions).catch(() => {});
    }, []);

    useEffect(() => {
        if (!modalOpen || !watchedWorkspace) {
            setGsLayers([]);
            return;
        }
        setGsLoading(true);
        listGeoserverLayers(watchedWorkspace)
            .then(setGsLayers)
            .catch(() => setGsLayers([]))
            .finally(() => setGsLoading(false));
    }, [watchedWorkspace, modalOpen]);

    const workspaceOptions = useMemo(
        () => workspaces.map((w) => ({
            value: w.alias,
            label: w.label ? `${w.alias} — ${w.label}` : w.alias,
        })),
        [workspaces],
    );

    const filtered = useMemo(
        () => (workspaceFilter ? capas.filter((c) => c.workspaceAlias === workspaceFilter) : capas),
        [capas, workspaceFilter],
    );

    const openCreate = () => {
        setEditing(null);
        form.setFieldsValue(EMPTY_FORM);
        setModalOpen(true);
    };

    const openEdit = (capa) => {
        setEditing(capa);
        setGsLayers(capa.geoserverLayer ? [{ name: capa.geoserverLayer, title: capa.nombre }] : []);
        form.setFieldsValue({
            slug: capa.slug,
            nombre: capa.nombre,
            workspaceAlias: capa.workspaceAlias,
            geoserverLayer: capa.geoserverLayer,
            searchTags: capa.searchTags || [],
            enabled: capa.enabled,
        });
        setModalOpen(true);
    };

    const handleWorkspaceChange = () => {
        form.setFieldValue('geoserverLayer', undefined);
    };

    const handleLayerChange = (layerName) => {
        if (!layerName) return;
        const selected = gsLayers.find((l) => l.name === layerName);
        if (!form.getFieldValue('nombre')) {
            form.setFieldValue('nombre', selected?.title || layerName);
        }
        if (!form.getFieldValue('slug')) {
            form.setFieldValue('slug', slugify(layerName));
        }
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
            setModalOpen(false);
            loadCapas();
            listTags().then(setTagOptions).catch(() => {});
        } catch (err) {
            message.error(err?.response?.data?.detail || 'Error al guardar la capa');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (capa) => {
        try {
            await eliminarCapa(capa.id);
            message.success('Capa eliminada');
            loadCapas();
        } catch {
            message.error('No se pudo eliminar la capa');
        }
    };

    const columns = buildColumns({ onEdit: openEdit, onDelete: handleDelete });

    return (
        <div style={{ padding: 24 }}>
            <Title level={3} style={{ marginTop: 0 }}>Catálogo de capas</Title>
            <Tabs
                items={[
                    {
                        key: 'lista',
                        label: 'Capas',
                        children: (
                            <>
                                <Space style={{ width: '100%', justifyContent: 'flex-end', marginBottom: 16 }}>
                                    <Select
                                        allowClear
                                        placeholder="Filtrar por workspace"
                                        style={{ width: 220 }}
                                        options={workspaceOptions}
                                        value={workspaceFilter}
                                        onChange={setWorkspaceFilter}
                                    />
                                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                                        Agregar capa
                                    </Button>
                                </Space>
                                <Table
                                    rowKey="id"
                                    loading={loading}
                                    columns={columns}
                                    dataSource={filtered}
                                    pagination={{ pageSize: 20 }}
                                />
                            </>
                        ),
                    },
                    {
                        key: 'bulk',
                        label: 'Alta por workspace',
                        children: (
                            <BulkByWorkspace
                                workspaces={workspaces}
                                capas={capas}
                                tagOptions={tagOptions}
                                onChanged={loadCapas}
                            />
                        ),
                    },
                ]}
            />

            <Modal
                title={editing ? 'Editar capa' : 'Agregar capa'}
                open={modalOpen}
                onOk={handleSave}
                onCancel={() => setModalOpen(false)}
                confirmLoading={saving}
                okText="Guardar"
                cancelText="Cancelar"
            >
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
                            options={gsLayers.map((l) => ({ value: l.name, label: l.title ? `${l.name} — ${l.title}` : l.name }))}
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
            </Modal>
        </div>
    );
};

export default CatalogoCapasPage;
