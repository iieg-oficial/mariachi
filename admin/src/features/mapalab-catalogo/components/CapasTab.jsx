import { useMemo, useState } from 'react';
import { Button, Input, Segmented, Space, Table, Typography } from 'antd';
import {
    AppstoreAddOutlined,
    CheckOutlined,
    ImportOutlined,
    OrderedListOutlined,
    PlusOutlined,
} from '@ant-design/icons';
import { buildColumns } from './catalogoColumns';
import CapaDetalleEditor from './CapaDetalleEditor';
import CapaFormPanel from './CapaFormPanel';
import ImportWorkspacePanel from './ImportWorkspacePanel';
import BulkAddPanel from './BulkAddPanel';
import CapasReorderTable from './CapasReorderTable';
import SelectionActionsBar from './SelectionActionsBar';

const { Text } = Typography;

const normalizar = (valor) => (valor || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const coincide = (capa, query, instituciones) => {
    const institucion = instituciones.find((i) => i.id === capa.institucionId);
    return [
        capa.nombre,
        capa.slug,
        capa.geoserverLayer,
        capa.workspaceAlias,
        institucion?.nombre,
        ...(capa.searchTags || []),
    ].some((campo) => normalizar(campo).includes(query));
};

const CapasTab = ({ data }) => {
    const {
        capas, workspaces, tagOptions, instituciones, loading, setCapas,
        loadCapas, reloadTags, reloadInstituciones,
        handleTagsSave, handleEnabledSave, handleInstitucionSave,
        handleDelete, handleBulkDelete, handleBulkUpdate,
    } = data;

    const [activePanel, setActivePanel] = useState(null);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [bulkBusy, setBulkBusy] = useState(false);
    const [reordering, setReordering] = useState(false);
    const [query, setQuery] = useState('');
    const [estado, setEstado] = useState('todas');

    const workspaceOptions = useMemo(
        () => workspaces.map((w) => ({
            value: w.alias,
            label: w.label ? `${w.alias} — ${w.label}` : w.alias,
        })),
        [workspaces],
    );

    const tagFilters = useMemo(
        () => Array.from(new Set(capas.flatMap((c) => c.searchTags || []).filter(Boolean)))
            .sort((a, b) => a.localeCompare(b))
            .map((v) => ({ text: v, value: v })),
        [capas],
    );

    const capasFiltradas = useMemo(() => {
        const q = normalizar(query).trim();
        return capas.filter((capa) => {
            if (estado === 'habilitadas' && !capa.enabled) return false;
            if (estado === 'deshabilitadas' && capa.enabled) return false;
            return !q || coincide(capa, q, instituciones);
        });
    }, [capas, query, estado, instituciones]);

    const togglePanel = (name) => {
        setActivePanel((prev) => (prev === name ? null : name));
    };

    const closePanel = () => setActivePanel(null);

    const afterMutation = () => {
        closePanel();
        loadCapas();
        reloadTags();
    };

    const runBulk = async (accion) => {
        setBulkBusy(true);
        await accion(selectedRowKeys);
        setSelectedRowKeys([]);
        setBulkBusy(false);
    };

    const toggleReordering = () => {
        setSelectedRowKeys([]);
        closePanel();
        setReordering((prev) => !prev);
    };

    const columns = buildColumns({
        onDelete: handleDelete,
        tagOptions,
        tagFilters,
        onTagsSave: handleTagsSave,
        onEnabledSave: handleEnabledSave,
        instituciones,
        onInstitucionSave: handleInstitucionSave,
    });

    const hasSelection = selectedRowKeys.length > 0;

    return (
        <>
            <Space wrap style={{ marginBottom: 12 }}>
                <Input.Search
                    allowClear
                    placeholder="Buscar por nombre, slug, capa de GeoServer, workspace, institución o etiqueta"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{ width: 'min(620px, 70vw)' }}
                />
                <Segmented
                    value={estado}
                    onChange={setEstado}
                    options={[
                        { value: 'todas', label: 'Todas' },
                        { value: 'habilitadas', label: 'Habilitadas' },
                        { value: 'deshabilitadas', label: 'Deshabilitadas' },
                    ]}
                />
            </Space>

            <Space wrap style={{ marginBottom: 16 }}>
                <Button
                    type={activePanel === 'create' ? 'primary' : 'default'}
                    icon={<PlusOutlined />}
                    onClick={() => togglePanel('create')}
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
                {(query || estado !== 'todas') && (
                    <Text type="secondary">
                        {capasFiltradas.length} de {capas.length}
                    </Text>
                )}
            </Space>

            {activePanel === 'create' && (
                <CapaFormPanel
                    workspaceOptions={workspaceOptions}
                    tagOptions={tagOptions}
                    instituciones={instituciones}
                    onCancel={closePanel}
                    onSaved={afterMutation}
                />
            )}
            {activePanel === 'import' && (
                <ImportWorkspacePanel
                    workspaceOptions={workspaceOptions}
                    capas={capas}
                    instituciones={instituciones}
                    onChanged={() => { loadCapas(); reloadTags(); reloadInstituciones(); }}
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
                <SelectionActionsBar
                    count={selectedRowKeys.length}
                    instituciones={instituciones}
                    tagOptions={tagOptions}
                    busy={bulkBusy}
                    onUpdate={(cambios) => runBulk((ids) => handleBulkUpdate(ids, cambios))}
                    onDelete={() => runBulk(handleBulkDelete)}
                    onCancel={() => setSelectedRowKeys([])}
                />
            )}

            {reordering ? (
                <CapasReorderTable capas={capas} loading={loading} onReorder={setCapas} />
            ) : (
                <Table
                    rowKey="id"
                    loading={loading}
                    columns={columns}
                    dataSource={capasFiltradas}
                    pagination={{ pageSize: 20 }}
                    scroll={{ x: 'max-content' }}
                    rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
                    expandable={{
                        expandedRowRender: (capa) => (
                            <CapaDetalleEditor
                                capa={capa}
                                workspaceOptions={workspaceOptions}
                                tagOptions={tagOptions}
                                instituciones={instituciones}
                                onSaved={() => { loadCapas(); reloadTags(); }}
                            />
                        ),
                        rowExpandable: () => true,
                    }}
                />
            )}
        </>
    );
};

export default CapasTab;
