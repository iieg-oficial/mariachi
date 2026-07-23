import { useEffect, useMemo, useState } from 'react';
import { Button, Popconfirm, Space, Table, Typography, message } from 'antd';
import {
    AppstoreAddOutlined,
    CheckOutlined,
    DeleteOutlined,
    ImportOutlined,
    OrderedListOutlined,
    PlusOutlined,
} from '@ant-design/icons';
import { buildColumns } from '../components/catalogoColumns';
import CapaFormPanel from '../components/CapaFormPanel';
import ImportWorkspacePanel from '../components/ImportWorkspacePanel';
import BulkAddPanel from '../components/BulkAddPanel';
import CapasReorderTable from '../components/CapasReorderTable';
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
    const [bulkBusy, setBulkBusy] = useState(false);
    const [reordering, setReordering] = useState(false);

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

    const handleTagsSave = async (id, searchTags) => {
        try {
            await actualizarCapa(id, { searchTags });
            setCapas((prev) => prev.map((c) => (c.id === id ? { ...c, searchTags } : c)));
            reloadTags();
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudieron guardar las etiquetas');
            throw err;
        }
    };

    const handleEnabledSave = async (id, enabled) => {
        try {
            await actualizarCapa(id, { enabled });
            setCapas((prev) => prev.map((c) => (c.id === id ? { ...c, enabled } : c)));
        } catch (err) {
            message.error(err?.response?.data?.detail || 'No se pudo cambiar el estado de la capa');
            throw err;
        }
    };

    const toggleReordering = () => {
        setSelectedRowKeys([]);
        closePanel();
        setReordering((prev) => !prev);
    };

    const columns = buildColumns({
        onDelete: handleDelete,
        workspaceFilters,
        tagFilters,
        tagOptions,
        onTagsSave: handleTagsSave,
        onEnabledSave: handleEnabledSave,
    });

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
                    disabled={reordering}
                >
                    Agregar múltiples capas
                </Button>
                <Button
                    type={reordering ? 'primary' : 'default'}
                    icon={reordering ? <CheckOutlined /> : <OrderedListOutlined />}
                    onClick={toggleReordering}
                >
                    {reordering ? 'Listo' : 'Reordenar'}
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
                    capas={capas}
                    onChanged={() => { loadCapas(); reloadTags(); }}
                />
            )}
            {activePanel === 'bulk' && (
                <BulkAddPanel
                    workspaceOptions={workspaceOptions}
                    capas={capas}
                    onChanged={() => { loadCapas(); reloadTags(); }}
                />
            )}

            {hasSelection && !reordering && (
                <div
                    style={{
                        position: 'sticky',
                        top: 64,
                        zIndex: 9,
                        background: '#fff',
                        paddingTop: 12,
                        marginBottom: 12,
                    }}
                >
                    <div
                        style={{
                            padding: '10px 12px',
                            background: '#fff',
                            border: '1px solid #f0f0f0',
                            borderRadius: 8,
                            boxShadow: '0 2px 8px rgba(0, 21, 41, 0.08)',
                        }}
                    >
                        <Space wrap>
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
                            <Button type="text" onClick={() => setSelectedRowKeys([])}>Cancelar selección</Button>
                        </Space>
                    </div>
                </div>
            )}

            {reordering ? (
                <CapasReorderTable capas={capas} loading={loading} onReorder={setCapas} />
            ) : (
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
            )}
        </div>
    );
};

export default CatalogoCapasPage;
