import { useEffect, useMemo, useState } from 'react';
import { Button, Popconfirm, Select, Space, Table, Typography, message } from 'antd';
import {
    AppstoreAddOutlined,
    DeleteOutlined,
    ImportOutlined,
    PlusOutlined,
    TagsOutlined,
} from '@ant-design/icons';
import { buildColumns } from '../components/catalogoColumns';
import CapaFormPanel from '../components/CapaFormPanel';
import ImportWorkspacePanel from '../components/ImportWorkspacePanel';
import BulkAddPanel from '../components/BulkAddPanel';
import {
    actualizarCapa,
    bulkDelete,
    eliminarCapa,
    listCapas,
    listTags,
    listWorkspaces,
} from '../api/catalogoService';

const { Title, Text } = Typography;

const uniqueSorted = (values) => Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));

const CatalogoCapasPage = () => {
    const [capas, setCapas] = useState([]);
    const [workspaces, setWorkspaces] = useState([]);
    const [tagOptions, setTagOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activePanel, setActivePanel] = useState(null);
    const [editing, setEditing] = useState(null);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [bulkTagOpen, setBulkTagOpen] = useState(false);
    const [bulkTags, setBulkTags] = useState([]);
    const [bulkBusy, setBulkBusy] = useState(false);

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

    const reloadTags = () => listTags().then(setTagOptions).catch(() => {});

    useEffect(() => {
        loadCapas();
        listWorkspaces().then(setWorkspaces).catch(() => {});
        reloadTags();
    }, []);

    const workspaceOptions = useMemo(
        () => workspaces.map((w) => ({
            value: w.alias,
            label: w.label ? `${w.alias} — ${w.label}` : w.alias,
        })),
        [workspaces],
    );

    const workspaceFilters = useMemo(
        () => uniqueSorted(capas.map((c) => c.workspaceAlias)).map((v) => ({ text: v, value: v })),
        [capas],
    );

    const tagFilters = useMemo(
        () => uniqueSorted(capas.flatMap((c) => c.searchTags || [])).map((v) => ({ text: v, value: v })),
        [capas],
    );

    const openCreatePanel = () => {
        if (activePanel === 'create' && !editing) {
            setActivePanel(null);
            return;
        }
        setEditing(null);
        setActivePanel('create');
    };

    const togglePanel = (name) => {
        setEditing(null);
        setActivePanel((prev) => (prev === name ? null : name));
    };

    const openEdit = (capa) => {
        setEditing(capa);
        setActivePanel('create');
    };

    const closePanel = () => {
        setActivePanel(null);
        setEditing(null);
    };

    const afterMutation = () => {
        closePanel();
        loadCapas();
        reloadTags();
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

    const handleBulkDelete = async () => {
        setBulkBusy(true);
        try {
            await bulkDelete(selectedRowKeys);
            message.success(`${selectedRowKeys.length} capa(s) eliminada(s)`);
            setSelectedRowKeys([]);
            loadCapas();
        } catch {
            message.error('No se pudieron eliminar las capas');
        } finally {
            setBulkBusy(false);
        }
    };

    const handleBulkTag = async () => {
        setBulkBusy(true);
        try {
            const byId = new Map(capas.map((c) => [c.id, c]));
            await Promise.all(selectedRowKeys.map((id) => {
                const capa = byId.get(id);
                if (!capa) return null;
                const merged = Array.from(new Set([...(capa.searchTags || []), ...bulkTags]));
                return actualizarCapa(id, { searchTags: merged });
            }));
            message.success(`Etiquetas agregadas a ${selectedRowKeys.length} capa(s)`);
            setBulkTags([]);
            setBulkTagOpen(false);
            setSelectedRowKeys([]);
            loadCapas();
            reloadTags();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudieron etiquetar las capas');
        } finally {
            setBulkBusy(false);
        }
    };

    const columns = buildColumns({ onDelete: handleDelete, workspaceFilters, tagFilters });

    const hasSelection = selectedRowKeys.length > 0;

    return (
        <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 16 }}>
                <Title level={2} style={{ margin: 0 }}>Catálogo de capas</Title>
                <Text type="secondary">
                    Capas sueltas que se publican en la vista pública de catálogo de Mapalab para consulta y descarga directa.
                </Text>
            </div>

            <Space wrap style={{ marginBottom: 16 }}>
                <Button
                    type={activePanel === 'create' && !editing ? 'primary' : 'default'}
                    icon={<PlusOutlined />}
                    onClick={openCreatePanel}
                >
                    Agregar capa
                </Button>
                <Button
                    type={activePanel === 'import' ? 'primary' : 'default'}
                    icon={<ImportOutlined />}
                    onClick={() => togglePanel('import')}
                >
                    Importar workspace
                </Button>
                <Button
                    type={activePanel === 'bulk' ? 'primary' : 'default'}
                    icon={<AppstoreAddOutlined />}
                    onClick={() => togglePanel('bulk')}
                >
                    Agregar múltiples capas
                </Button>
            </Space>

            {activePanel === 'create' && (
                <CapaFormPanel
                    workspaceOptions={workspaceOptions}
                    tagOptions={tagOptions}
                    editing={editing}
                    onCancel={closePanel}
                    onSaved={afterMutation}
                />
            )}
            {activePanel === 'import' && (
                <ImportWorkspacePanel
                    workspaceOptions={workspaceOptions}
                    tagOptions={tagOptions}
                    capas={capas}
                    onChanged={() => { loadCapas(); reloadTags(); }}
                />
            )}
            {activePanel === 'bulk' && (
                <BulkAddPanel
                    workspaceOptions={workspaceOptions}
                    tagOptions={tagOptions}
                    capas={capas}
                    onChanged={() => { loadCapas(); reloadTags(); }}
                />
            )}

            {hasSelection && (
                <Space wrap style={{ marginBottom: 12 }}>
                    <Text strong>{selectedRowKeys.length} seleccionada(s)</Text>
                    <Popconfirm
                        title={`¿Eliminar ${selectedRowKeys.length} capa(s) del catálogo?`}
                        okText="Eliminar"
                        cancelText="Cancelar"
                        okButtonProps={{ danger: true }}
                        onConfirm={handleBulkDelete}
                    >
                        <Button danger icon={<DeleteOutlined />} loading={bulkBusy}>Eliminar</Button>
                    </Popconfirm>
                    <Button icon={<TagsOutlined />} onClick={() => setBulkTagOpen((o) => !o)}>Etiquetar</Button>
                    <Button type="text" onClick={() => setSelectedRowKeys([])}>Cancelar selección</Button>
                    {bulkTagOpen && (
                        <>
                            <Select
                                mode="tags"
                                style={{ minWidth: 240 }}
                                value={bulkTags}
                                onChange={setBulkTags}
                                options={tagOptions.map((t) => ({ value: t, label: t }))}
                                placeholder="Etiquetas a agregar"
                            />
                            <Button
                                type="primary"
                                onClick={handleBulkTag}
                                loading={bulkBusy}
                                disabled={!bulkTags.length}
                            >
                                Aplicar
                            </Button>
                        </>
                    )}
                </Space>
            )}

            <Table
                rowKey="id"
                loading={loading}
                columns={columns}
                dataSource={capas}
                pagination={{ pageSize: 20 }}
                rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
                onRow={(record) => ({
                    onDoubleClick: () => { if (!hasSelection) openEdit(record); },
                })}
            />
        </div>
    );
};

export default CatalogoCapasPage;
